import { forwardRef } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { FONT, theme } from '../theme'

echarts.use([BarChart, LineChart, PieChart, HeatmapChart, GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

export const CHART_HEIGHT = 230

export const baseTooltip = {
  backgroundColor: '#fff',
  borderColor: theme.border,
  borderWidth: 1,
  textStyle: { color: theme.text, fontFamily: FONT, fontSize: 12 },
  extraCssText: 'box-shadow:0 4px 14px rgba(16,24,40,.14);border-radius:6px;',
} as const

export const axisText = { color: theme.textMuted, fontFamily: FONT, fontSize: 11 } as const

interface Props {
  option: EChartsOption
  onClick?: (params: { dataIndex: number; name?: string }) => void
}

export const Chart = forwardRef<ReactEChartsCore, Props>(function Chart({ option, onClick }, ref) {
  return (
    <ReactEChartsCore
      ref={ref}
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ height: CHART_HEIGHT, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      onEvents={onClick ? { click: onClick } : undefined}
    />
  )
})
