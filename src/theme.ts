// Single source of design tokens. Applied as CSS variables at startup (see applyTheme)
// and read directly by the ECharts option builders.

export const theme = {
  // Guardian shell
  guardianBlue: '#4d62ff',
  guardianBlueDark: '#3a4de6',
  guardianBlueLine: '#6b7cff',
  statusBar: '#444444',
  pageBg: '#efefef',
  logoPurple: '#a259f0',

  // Dashboard
  card: '#ffffff',
  border: '#e3e5ea',
  text: '#1c2230',
  textMuted: '#667085',
  textFaint: '#98a2b3',
  /** Primary series colour */
  primary: '#4d62ff',
  /** Tint for non-selected periods */
  primaryMuted: '#c7cffd',
  secondary: '#a259f0',
  good: '#1f9d6b',
  alert: '#d64545',
  target: '#e08a00',
  grid: '#eceef2',
  // Colour-blind-safe categorical palette (Okabe–Ito based)
  categorical: ['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00'],
} as const

const cssName = (k: string) => `--c-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`

export function applyTheme(): void {
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme)) {
    if (typeof v === 'string') root.style.setProperty(cssName(k), v)
  }
}

export const FONT = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
