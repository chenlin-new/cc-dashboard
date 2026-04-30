import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Brain,
  ListChecks,
  Wrench,
  Cpu,
  Puzzle,
  Radio,
  Bug,
  Settings2,
  Sparkles,
  Palette,
  Languages,
  ChevronUp,
  ChevronRight,
  Clock,
  MessageSquare,
  FolderHeart,
  FolderGit2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useLocale } from '../contexts/LocaleContext'
import { useTheme, themeOptions } from '../contexts/ThemeContext'
import { fetchProjects } from '../api'
import type { ProjectInfo } from '../types'

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
  { to: '/arthas', icon: Bug, label: 'nav.arthas' },
  { to: '/settings', icon: Settings2, label: 'nav.settings' },
]

const VIS_KEY = 'cc-dashboard-hidden-nav'

function loadHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(VIS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>()
  } catch { return new Set() }
}

function saveHidden(s: Set<string>) {
  localStorage.setItem(VIS_KEY, JSON.stringify([...s]))
}

export default function Sidebar() {
  const { locale, setLocale, t } = useLocale()
  const { theme, setTheme } = useTheme()
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showVisPicker, setShowVisPicker] = useState(false)
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [showProjects, setShowProjects] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(loadHidden)
  const navigate = useNavigate()
  const location = useLocation()
  const activeProject = location.pathname.startsWith('/project/')
    ? decodeURIComponent(location.pathname.split('/project/')[1])
    : null

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeProject) {
      setExpandedProjects(prev => new Set([...prev, activeProject]))
    }
  }, [activeProject])

  const toggleProject = (encodedName: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(encodedName)) next.delete(encodedName)
      else next.add(encodedName)
      return next
    })
  }

  const toggleHidden = (label: string) => {
    setHiddenItems(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      saveHidden(next)
      return next
    })
  }

  const visibleItems = navItems.filter(item => !hiddenItems.has(item.label))

  return (
    <aside className="flex w-60 flex-col border-r border-slate-800/50 bg-slate-900/30 backdrop-blur-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
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

      {/* Projects Section */}
      <div className="border-b border-slate-800/30 pb-2">
        <button
          onClick={() => setShowProjects(!showProjects)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showProjects ? <ChevronUp className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <FolderHeart className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{t('nav.projects')}</span>
          <span className="text-[10px] text-slate-600 tabular-nums">{projects.length}</span>
        </button>
        {showProjects && (
          <div className="mt-1 space-y-0.5 px-2 max-h-[300px] overflow-y-auto">
            {projects.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-slate-600">{t('project.noProjects')}</p>
            ) : (
              projects.map(proj => {
                const isExpanded = expandedProjects.has(proj.encodedName)
                return (
                  <div key={proj.encodedName}>
                    <div
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-all hover:bg-slate-800/30 group ${
                        activeProject === proj.encodedName ? 'bg-sky-500/10 ring-1 ring-sky-500/20' : ''
                      }`}
                      onClick={() => toggleProject(proj.encodedName)}
                    >
                      <FolderGit2 className={`h-3.5 w-3.5 shrink-0 ${activeProject === proj.encodedName ? 'text-sky-400' : 'text-sky-500/70'}`} />
                      <span className={`flex-1 text-xs truncate ${activeProject === proj.encodedName ? 'text-sky-400 font-medium' : 'text-slate-300'}`} title={proj.name}>
                        {proj.name}
                      </span>
                      <ChevronRight className={`h-3 w-3 text-slate-600 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800/40 pl-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/project/${encodeURIComponent(proj.encodedName)}`) }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-400 hover:text-sky-400 hover:bg-slate-800/30 transition-all"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {t('project.chat')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/memory?project=${encodeURIComponent(proj.encodedName)}`) }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-400 hover:text-purple-400 hover:bg-slate-800/30 transition-all"
                        >
                          <Brain className="h-3 w-3" />
                          {t('nav.memory')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/skills?project=${encodeURIComponent(proj.encodedName)}`) }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-400 hover:text-purple-400 hover:bg-slate-800/30 transition-all"
                        >
                          <Wrench className="h-3 w-3" />
                          {t('nav.skills')}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto py-2">
        {visibleItems.map((item) => (
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
        {/* Visibility Picker */}
        <div>
          <button
            onClick={() => setShowVisPicker(!showVisPicker)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{t('sidebar.visibility')}</span>
            <span className="text-[10px] text-slate-600 tabular-nums">{visibleItems.length}/{navItems.length}</span>
            <ChevronUp className={`h-3 w-3 transition-transform ${showVisPicker ? '' : 'rotate-180'}`} />
          </button>
          {showVisPicker && (
            <div className="mt-1.5 space-y-0.5 px-2 max-h-[300px] overflow-y-auto">
              {navItems.map((item) => {
                const hidden = hiddenItems.has(item.label)
                return (
                  <button
                    key={item.to}
                    onClick={() => toggleHidden(item.label)}
                    className={`flex items-center gap-2 w-full rounded-lg px-2 py-1.5 transition-all ${
                      hidden ? 'text-slate-600 hover:bg-slate-800/40' : 'text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left text-[11px]">{t(item.label)}</span>
                    {hidden ? (
                      <EyeOff className="h-3 w-3 shrink-0 text-slate-600" />
                    ) : (
                      <Eye className="h-3 w-3 shrink-0 text-sky-400" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

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
