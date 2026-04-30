import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface ThemeOption {
  id: string
  key: string
  colors: string[] // 4-color swatch: bg | surface | accent | text
}

export const themeOptions: ThemeOption[] = [
  { id: 'system', key: 'theme.system', colors: ['#94a3b8', '#64748b', '#38bdf8', '#e2e8f0'] },
  { id: 'deep-space', key: 'theme.deepSpace', colors: ['#0b1120', '#1e293b', '#38bdf8', '#e2e8f0'] },
  { id: 'dracula', key: 'theme.dracula', colors: ['#1a1033', '#282a36', '#bd93f9', '#f8f8f2'] },
  { id: 'nord', key: 'theme.nord', colors: ['#242933', '#2e3440', '#88c0d0', '#e5e9f0'] },
  { id: 'one-dark', key: 'theme.oneDark', colors: ['#1e222a', '#282c34', '#61afef', '#abb2bf'] },
  { id: 'monokai', key: 'theme.monokai', colors: ['#1e1f1c', '#272822', '#a6e22e', '#f8f8f2'] },
  { id: 'tokyo-night', key: 'theme.tokyoNight', colors: ['#1a1b26', '#24283b', '#7aa2f7', '#c0caf5'] },
  { id: 'solarized', key: 'theme.solarized', colors: ['#002b36', '#073642', '#2aa198', '#eee8d5'] },
  { id: 'light-plus', key: 'theme.lightPlus', colors: ['#ffffff', '#f3f3f3', '#007acc', '#1e1e1e'] },
]

export const themeColors: Record<string, string> = Object.fromEntries(
  themeOptions.map(t => [t.id, t.colors[2]]) // accent is index 2
)

interface ThemeContextType {
  theme: string
  setTheme: (t: string) => void
  resolvedTheme: string
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'deep-space',
  setTheme: () => {},
  resolvedTheme: 'deep-space',
})

function useSystemDark(): boolean {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return dark
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('cc-theme') || 'deep-space'
  })
  const systemDark = useSystemDark()

  const setTheme = (t: string) => {
    setThemeState(t)
    localStorage.setItem('cc-theme', t)
  }

  const resolvedTheme = theme === 'system'
    ? (systemDark ? 'deep-space' : 'light-plus')
    : theme

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.setAttribute(
        'data-theme',
        systemDark ? 'deep-space' : 'light-plus'
      )
    }
  }, [theme, systemDark])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
