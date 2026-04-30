import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  Brain,
  ListChecks,
  Wrench,
  Cpu,
  Puzzle,
  Radio,
  Settings2,
  Sparkles,
  Palette,
  Languages,
  ChevronUp,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { useLocale } from '../contexts/LocaleContext'
import { useTheme, themeOptions } from '../contexts/ThemeContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/memory', icon: Brain, label: 'nav.memory' },
  { to: '/tasks', icon: ListChecks, label: 'nav.tasks' },
  { to: '/chat', icon: MessageSquare, label: 'nav.chat' },
  { to: '/agents', icon: Radio, label: 'nav.agents' },
  { to: '/sessions', icon: Clock, label: 'nav.sessions' },
  { to: '/skills', icon: Wrench, label: 'nav.skills' },
  { to: '/mcp', icon: Cpu, label: 'nav.mcp' },
  { to: '/plugins', icon: Puzzle, label: 'nav.plugins' },
  { to: '/settings', icon: Settings2, label: 'nav.settings' },
]

export default function Sidebar() {
  const { locale, setLocale, t } = useLocale()
  const { theme, setTheme } = useTheme()
  const [showThemePicker, setShowThemePicker] = useState(false)

  return (
    <aside className="flex w-60 flex-col border-r border-slate-800/50 bg-slate-900/30 backdrop-blur-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-6">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg"
          style={{
            background: `linear-gradient(135deg, var(--cc-accent), var(--cc-accent-secondary))`,
            boxShadow: `0 4px 12px color-mix(in srgb, var(--cc-accent) 20%, transparent)`,
          }}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100">
            <span className="gradient-text">CC</span> Dashboard
          </h1>
          <p className="text-xs text-slate-500">Claude Code</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-[var(--cc-accent)] shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: `color-mix(in srgb, var(--cc-accent) 10%, transparent)` }
                : {}
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {t(item.label)}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Controls */}
      <div className="border-t border-slate-800/50 px-3 pt-3 pb-4 space-y-2">
        {/* Theme picker */}
        <div>
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200"
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{t('theme.title')}</span>
            <span className="flex items-center gap-0.5">
              {themeOptions.find(o => o.id === theme)?.colors.slice(0, 4).map((c, i) => (
                <span key={i} className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
              ))}
            </span>
            <ChevronUp className={`h-3 w-3 transition-transform ${showThemePicker ? '' : 'rotate-180'}`} />
          </button>
          {showThemePicker && (
            <div className="mt-1.5 space-y-0.5 px-2 max-h-[300px] overflow-y-auto">
              {themeOptions.map((opt) => {
                const isActive = theme === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    title={t(opt.key)}
                    className={`flex items-center gap-2 w-full rounded-lg px-2 py-1.5 transition-all ${
                      isActive
                        ? 'bg-slate-700/40 ring-1 ring-slate-400/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex gap-0.5 shrink-0">
                      {opt.colors.map((c, i) => (
                        <span
                          key={i}
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: c, boxShadow: i === 2 ? `0 0 4px ${c}80` : undefined }}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] ${isActive ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                      {t(opt.key)}
                    </span>
                    {isActive && <span className="ml-auto text-[10px] text-slate-500">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200"
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{t('language.switch')}</span>
          <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-xs font-medium text-slate-500">
            {locale === 'zh' ? 'EN' : '中文'}
          </span>
        </button>
      </div>
    </aside>
  )
}
