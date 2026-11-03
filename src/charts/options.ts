/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts'
import { axisText, baseTooltip } from '../components/Chart'
import type { Backlog, CategoryRow, GameRow, Heatmap, LocationsEgms, ResolutionTrend, SiteRow, TechRow, TopIssues, Trend } from '../data/api'
import { DOW_SHORT } from '../dates'
import { FONT, theme } from '../theme'

type P = any

const GRID = { left: 8, right: 14, top: 28, bottom: 6, containLabel: true }

const valueAxis = (fmt: (v: number) => string, extra: object = {}) => ({
  type: 'value' as const,
  axisLabel: { ...axisText, formatter: fmt },
  splitLine: { lineStyle: { color: theme.grid } },
  axisLine: { show: false },
  axisTick: { show: false },
  ...extra,
})

/** Month buckets read "Nov '25": show the month, and the year only at the start and each January. */
const trendAxisLabel = (labels: string[]) => ({
  ...axisText,
  hideOverlap: true,
  formatter: (v: string, i: number) => {
    const m = /^([A-Z][a-z]{2}) '(\d{2})$/.exec(v)
    if (!m) return v
    return i === 0 || m[1] === 'Jan' ? `${m[1]}\n’${m[2]}` : m[1]
  },
  interval: labels.length > 16 ? 'auto' : 0,
})

const categoryAxis = (labels: string[]) => ({
  type: 'category' as const,
  data: labels,
  axisTick: { show: false },
  axisLine: { lineStyle: { color: theme.border } },
  axisLabel: trendAxisLabel(labels),
})

const tipHeader = (t: string) => `<div style="font-weight:600;margin-bottom:4px">${t}</div>`
const tipLine = (color: string, name: string, value: string) =>
  `<div style="display:flex;justify-content:space-between;gap:16px"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></span>${name}</span><b>${value}</b></div>`
const tipPlain = (name: string, value: string) =>
  `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:${theme.textMuted}">${name}</span><b>${value}</b></div>`

const NA = '—'

function barColors(t: { selected: number; values: unknown[] }, color: string = theme.primary, muted: string = theme.primaryMuted) {
  return t.values.map((v, i) => ({ value: v as number | null, itemStyle: { color: t.selected === -1 || t.selected === i ? color : muted } }))
}

export function barTrend(t: Trend, o: { name: string; axis: (v: number) => string; tip: (v: number) => string; extra?: (i: number) => string; color?: string }): EChartsOption {
  const labels = t.buckets.map((b) => b.label)
  return {
    grid: GRID,
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(77,98,255,.06)' } },
      formatter: (ps: P) => {
        const i = ps[0].dataIndex
        const v = t.values[i]
        return tipHeader(t.buckets[i].full) + tipLine(o.color ?? theme.primary, o.name, v == null ? NA : o.tip(v)) + (o.extra?.(i) ?? '')
      },
    },
    xAxis: categoryAxis(labels),
    yAxis: valueAxis(o.axis),
    series: [{ type: 'bar', data: barColors(t, o.color), barMaxWidth: 26, itemStyle: { borderRadius: [3, 3, 0, 0] } }],
  }
}

export function lineTrend(
  t: Trend,
  o: { name: string; axis: (v: number) => string; tip: (v: number) => string; min?: number | 'dataMin'; max?: number; avgLine?: boolean; target?: { value: number; label: string } },
): EChartsOption {
  const labels = t.buckets.map((b) => b.label)
  const nums = t.values.filter((v): v is number => v != null)
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  const lines: P[] = []
  if (o.avgLine && avg != null) lines.push({ yAxis: avg, label: { formatter: `Avg ${o.axis(avg)}`, position: 'insideEndTop', color: theme.textMuted, fontSize: 10 }, lineStyle: { color: theme.textFaint, type: 'dashed' } })
  if (o.target) lines.push({ yAxis: o.target.value, label: { formatter: o.target.label, position: 'insideEndBottom', color: theme.target, fontSize: 10 }, lineStyle: { color: theme.target, type: 'dashed' } })
  return {
    grid: GRID,
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      formatter: (ps: P) => {
        const i = ps[0].dataIndex
        const v = t.values[i]
        return tipHeader(t.buckets[i].full) + tipLine(theme.primary, o.name, v == null ? NA : o.tip(v))
      },
    },
    xAxis: { ...categoryAxis(labels), boundaryGap: true },
    yAxis: valueAxis(o.axis, { min: o.min ?? 'dataMin', max: o.max, scale: true }),
    series: [
      {
        type: 'line',
        data: t.values.map((v, i) => ({ value: v, symbolSize: t.selected === i ? 11 : 6, itemStyle: { color: t.selected === -1 || t.selected === i ? theme.primary : theme.primaryMuted } })),
        symbol: 'circle',
        lineStyle: { color: theme.primary, width: 2 },
        itemStyle: { color: theme.primary },
        markLine: lines.length ? { silent: true, symbol: 'none', data: lines } : undefined,
      },
    ],
  }
}

export function locationsEgms(d: LocationsEgms): EChartsOption {
  const labels = d.buckets.map((b) => b.label)
  return {
    grid: { ...GRID, top: 36 },
    legend: { top: 0, right: 8, itemWidth: 10, itemHeight: 10, textStyle: axisText },
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      formatter: (ps: P) => {
        const i = ps[0].dataIndex
        return tipHeader(d.buckets[i].full) + tipLine(theme.primary, 'Active EGMs', d.egms[i].toLocaleString('en-US')) + tipLine(theme.secondary, 'Active locations', d.locations[i].toLocaleString('en-US'))
      },
    },
    xAxis: categoryAxis(labels),
    yAxis: [
      valueAxis((v) => v.toLocaleString('en-US'), { scale: false, min: 0 }),
      valueAxis((v) => v.toLocaleString('en-US'), { splitLine: { show: false }, min: 0 }),
    ],
    series: [
      { name: 'Active EGMs', type: 'bar', data: barColors({ selected: d.selected, values: d.egms }), barMaxWidth: 24, itemStyle: { borderRadius: [3, 3, 0, 0] } },
      { name: 'Active locations', type: 'line', yAxisIndex: 1, data: d.locations, symbol: 'circle', symbolSize: 6, lineStyle: { color: theme.secondary, width: 2 }, itemStyle: { color: theme.secondary } },
    ],
  }
}

const trunc = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function siteBars(rows: SiteRow[], metric: 'netWin' | 'nwpd', fmtAxis: (v: number) => string, fmtTip: (v: number) => string, name: string): EChartsOption {
  return {
    grid: { left: 8, right: 14, top: 24, bottom: 6, containLabel: true },
    tooltip: {
      ...baseTooltip,
      trigger: 'item',
      formatter: (p: P) => {
        const r = rows[p.dataIndex]
        return tipHeader(r.name) + tipLine(theme.primary, name, fmtTip(r[metric] ?? 0)) + tipPlain('EGMs', String(r.egms)) + (metric === 'netWin' ? tipPlain('NWPD', r.nwpd == null ? NA : `$${r.nwpd.toFixed(2)}`) : tipPlain('Net win', `$${r.netWin.toFixed(2)}`)) + `<div style="margin-top:4px;color:${theme.textFaint};font-size:11px">Click to filter to this site</div>`
      },
    },
    xAxis: {
      type: 'category',
      data: rows.map((r) => trunc(r.name)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: { ...axisText, rotate: 40, interval: 0 },
    },
    yAxis: valueAxis(fmtAxis),
    series: [{ type: 'bar', cursor: 'pointer', data: rows.map((r) => r[metric]), barMaxWidth: 26, itemStyle: { color: theme.primary, borderRadius: [3, 3, 0, 0] } }],
  }
}

export function topGames(rows: GameRow[]): EChartsOption {
  const names = rows.map((r) => trunc(r.name, 20))
  const panels = [
    { title: 'NWPD ($)', key: 'nwpd' as const, fmt: (v: number) => `$${v.toFixed(0)}`, tip: (v: number) => `$${v.toFixed(2)}`, left: 27, width: 21, color: theme.primary },
    { title: 'Plays', key: 'plays' as const, fmt: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 1e5 ? 0 : 1)}K` : v.toFixed(0)), tip: (v: number) => Math.round(v).toLocaleString('en-US'), left: 53, width: 21, color: theme.categorical[0] },
    { title: 'Avg bet ($)', key: 'avgBet' as const, fmt: (v: number) => `$${v.toFixed(2)}`, tip: (v: number) => `$${v.toFixed(2)}`, left: 79, width: 19, color: theme.secondary },
  ]
  return {
    grid: panels.map((p) => ({ left: `${p.left}%`, width: `${p.width}%`, top: 30, bottom: 8, containLabel: false })),
    title: panels.map((p) => ({ text: p.title, left: `${p.left}%`, top: 4, textStyle: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: theme.textMuted } })),
    tooltip: {
      ...baseTooltip,
      trigger: 'item',
      formatter: (p: P) => {
        const r = rows[p.dataIndex]
        return tipHeader(r.name) + tipPlain('NWPD', `$${r.nwpd.toFixed(2)}`) + tipPlain('Plays', Math.round(r.plays).toLocaleString('en-US')) + tipPlain('Avg bet', `$${r.avgBet.toFixed(2)}`)
      },
    },
    xAxis: panels.map((_p, i) => ({ type: 'value' as const, gridIndex: i, show: false, max: (v: { max: number }) => v.max * 1.55 })),
    yAxis: panels.map((_, i) => ({
      type: 'category' as const,
      gridIndex: i,
      inverse: true,
      data: names,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: i === 0 ? { ...axisText, color: theme.text, width: 120, overflow: 'truncate' as const } : { show: false },
    })),
    series: panels.map((p, i) => ({
      type: 'bar' as const,
      xAxisIndex: i,
      yAxisIndex: i,
      data: rows.map((r) => r[p.key]),
      barWidth: 16,
      itemStyle: { color: p.color, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right' as const, formatter: (x: P) => p.fmt(x.value), color: theme.textMuted, fontSize: 10, fontFamily: FONT },
    })),
  }
}

export function categoryBars(rows: CategoryRow[], o: { name: string; axis: (v: number) => string; tip: (v: number) => string; unit?: string }): EChartsOption {
  return {
    grid: { left: 8, right: 14, top: 24, bottom: 6, containLabel: true },
    tooltip: {
      ...baseTooltip,
      trigger: 'item',
      formatter: (p: P) => {
        const r = rows[p.dataIndex]
        return tipHeader(r.name) + tipLine(theme.primary, o.name, o.tip(r.value)) + tipPlain('EGMs', r.egms.toLocaleString('en-US'))
      },
    },
    xAxis: { type: 'category', data: rows.map((r) => r.name), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.border } }, axisLabel: { ...axisText, interval: 0, width: 70, overflow: 'break' } },
    yAxis: valueAxis(o.axis),
    series: [{ type: 'bar', data: rows.map((r) => r.value), barMaxWidth: 36, itemStyle: { color: theme.primary, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', formatter: (x: P) => o.axis(x.value), color: theme.textMuted, fontSize: 10, fontFamily: FONT } }],
  }
}

const hourLabel = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`)

export function heatmap(d: Heatmap): EChartsOption {
  return {
    grid: { left: 8, right: 14, top: 4, bottom: 44, containLabel: true },
    tooltip: {
      ...baseTooltip,
      trigger: 'item',
      formatter: (p: P) => tipHeader(`${DOW_SHORT[p.value[1]]} ${hourLabel(p.value[0])}`) + tipPlain('Net win per EGM-hour', `$${p.value[2].toFixed(2)}`),
    },
    xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => hourLabel(h)), splitArea: { show: false }, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { ...axisText, interval: 1 } },
    yAxis: { type: 'category', data: DOW_SHORT, inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: axisText },
    visualMap: { type: 'continuous', min: 0, max: Math.max(d.max, 1), calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 160, text: ['$/EGM-hr high', 'low'], textStyle: axisText, inRange: { color: ['#eef0ff', '#aab5ff', theme.primary, '#1b2a9e'] }, formatter: (v: P) => `$${Number(v).toFixed(1)}` },
    series: [{ type: 'heatmap', data: d.cells, itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 2 }, emphasis: { itemStyle: { borderColor: theme.text, borderWidth: 1 } } }],
  }
}

export function pie(d: TopIssues): EChartsOption {
  return {
    color: [...theme.categorical],
    tooltip: { ...baseTooltip, trigger: 'item', formatter: (p: P) => tipHeader(p.name) + tipPlain('Calls', `${p.value.toLocaleString('en-US')} (${p.percent}%)`) },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, itemGap: 8, textStyle: { ...axisText, fontSize: 10 } },
    series: [
      {
        type: 'pie',
        radius: '50%',
        center: ['50%', '42%'],
        data: d.rows,
        label: { formatter: (p: P) => `${p.percent}%\n(${p.value.toLocaleString('en-US')})`, fontFamily: FONT, fontSize: 11, color: theme.text, lineHeight: 14 },
        labelLine: { length: 8, length2: 6 },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      },
    ],
  }
}

export function resolution(d: ResolutionTrend): EChartsOption {
  const labels = d.buckets.map((b) => b.label)
  return {
    grid: { ...GRID, top: 36 },
    legend: { top: 0, right: 8, itemWidth: 14, itemHeight: 8, textStyle: axisText },
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      formatter: (ps: P) => {
        const i = ps[0].dataIndex
        const f = (v: number | null) => (v == null ? NA : `${v.toFixed(1)} h`)
        return tipHeader(d.buckets[i].full) + tipLine(theme.primary, 'Average', f(d.avg[i])) + tipLine(theme.categorical[1], 'Median', f(d.median[i]))
      },
    },
    xAxis: categoryAxis(labels),
    yAxis: valueAxis((v) => `${v}h`, { min: 0 }),
    series: [
      { name: 'Average', type: 'line', data: d.avg, symbol: 'circle', symbolSize: 6, lineStyle: { color: theme.primary, width: 2 }, itemStyle: { color: theme.primary } },
      { name: 'Median', type: 'line', data: d.median, symbol: 'circle', symbolSize: 6, lineStyle: { color: theme.categorical[1], width: 2 }, itemStyle: { color: theme.categorical[1] } },
    ],
  }
}

export function backlog(d: Backlog): EChartsOption {
  return {
    grid: GRID,
    tooltip: { ...baseTooltip, trigger: 'item', formatter: (p: P) => tipHeader(`Open ${p.name}`) + tipPlain('Calls', String(p.value)) },
    xAxis: { type: 'category', data: d.labels, axisTick: { show: false }, axisLine: { lineStyle: { color: theme.border } }, axisLabel: { ...axisText, interval: 0 } },
    yAxis: valueAxis((v) => String(v), { minInterval: 1, min: 0 }),
    series: [
      {
        type: 'bar',
        barMaxWidth: 44,
        data: d.counts.map((v, i) => ({ value: v, itemStyle: { color: i === 3 ? theme.alert : theme.primary, borderRadius: [3, 3, 0, 0] } })),
        label: { show: true, position: 'top', color: theme.textMuted, fontSize: 11, fontFamily: FONT },
      },
    ],
  }
}

export function techBars(rows: TechRow[]): EChartsOption {
  return {
    grid: { left: 8, right: 36, top: 8, bottom: 6, containLabel: true },
    tooltip: {
      ...baseTooltip,
      trigger: 'item',
      formatter: (p: P) => {
        const r = rows[p.dataIndex]
        return tipHeader(r.name) + tipLine(theme.primary, 'Calls closed', String(r.closed)) + tipPlain('Median resolution', r.medianHours == null ? NA : `${r.medianHours.toFixed(1)} h`) + tipPlain('First-time fix rate', r.ftfr == null ? NA : `${r.ftfr.toFixed(1)}%`)
      },
    },
    xAxis: valueAxis((v) => String(v), { min: 0 }),
    yAxis: { type: 'category', inverse: true, data: rows.map((r) => r.name), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.border } }, axisLabel: { ...axisText, color: theme.text, fontSize: 12 } },
    series: [{ type: 'bar', data: rows.map((r) => r.closed), barMaxWidth: 18, itemStyle: { color: theme.primary, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: theme.textMuted, fontSize: 11, fontFamily: FONT } }],
  }
}
