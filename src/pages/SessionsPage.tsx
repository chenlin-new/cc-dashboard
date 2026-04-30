import { useState, useEffect } from 'react'
import { Clock, Sparkles, HardDrive, MessageSquare, FolderOpen, X, User, Bot, ChevronLeft, FileText, Search } from 'lucide-react'
import { fetchSessions } from '../api'
import { useLocale } from '../contexts/LocaleContext'

const BASE = '/api'

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function fmtTime(ms: number) {
  return new Date(ms).toLocaleString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtFullTime(ms: number) {
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function msgPreview(msg: any): { role: string; text: string } {
  const role = msg.role || msg.type || 'unknown'
  let text = ''
  if (typeof msg.message === 'string') text = msg.message
  else if (msg.message?.text) text = msg.message.text
  else if (msg.message?.content) {
    if (Array.isArray(msg.message.content)) text = msg.message.content.map((c: any) => c.text || c.type || '').join(' ')
    else text = String(msg.message.content)
  }
  else if (typeof msg.content === 'string') text = msg.content
  else if (Array.isArray(msg.content)) text = msg.content.map((c: any) => c.text || '').join(' ')
  return { role, text: text.slice(0, 500) }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')
  const { t } = useLocale()

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? sessions.filter(s =>
        s.project.toLowerCase().includes(search.toLowerCase()) ||
        (s.firstMsg || '').toLowerCase().includes(search.toLowerCase())
      )
    : sessions

  const openDetail = async (s: any) => {
    setSelected(s)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`${BASE}/sessions/${encodeURIComponent(s.project)}/${encodeURIComponent(s.id)}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data.messages || [])
      }
    } catch {}
    setDetailLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-slate-500">
      <Sparkles className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Clock className="h-6 w-6 text-amber-400" />
          {t('sessions.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('sessions.desc', { count: sessions.length })}
          {sessions.length > 0 && <span className="ml-2 text-slate-600">
            · {fmtSize(sessions.reduce((a, s) => a + s.size, 0))} 总计
          </span>}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索项目或消息..."
          className="w-full rounded-lg border border-slate-800/50 bg-slate-900/30 px-9 py-2 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Clock className="mb-3 h-10 w-10 text-slate-700" /><p>{search ? '无匹配结果' : t('common.noData')}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Timeline */}
          <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="relative space-y-0">
              <div className="absolute left-[19px] top-8 bottom-8 w-px bg-slate-800/60" />
              <div className="space-y-3">
                {filtered.map((s) => (
                  <div key={s.id} className={`relative flex gap-4 pl-0 cursor-pointer transition-all rounded-xl ${
                    selected?.id === s.id && selected?.project === s.project ? 'bg-slate-800/20 -mx-2 px-2' : 'hover:bg-slate-800/10 -mx-2 px-2'
                  }`} onClick={() => openDetail(s)}>
                    {/* Dot */}
                    <div className="relative z-10 flex shrink-0 items-center justify-center">
                      <div className={`h-[10px] w-[10px] rounded-full ring-2 ring-slate-900 ${
                        s.size > 100000 ? 'bg-sky-400' : s.size > 10000 ? 'bg-slate-400' : 'bg-slate-600'
                      }`} />
                    </div>
                    {/* Card */}
                    <div className="min-w-0 flex-1 rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 backdrop-blur-sm transition-all hover:border-slate-700/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />
                          <span className="truncate text-xs font-mono text-slate-400">{s.project.replace('-Users-lin', '~').replace('-Desktop-work-pms', '/pms').replace(/^-/, '')}</span>
                        </div>
                        <span className="shrink-0 text-xs text-slate-600">{fmtTime(s.mtime)}</span>
                      </div>
                      {s.firstMsg && (
                        <p className="mt-2 text-sm text-slate-300 line-clamp-2">{s.firstMsg}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{fmtSize(s.size)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{s.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="lg:col-span-1">
              <div className="sticky top-0 rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-slate-200 truncate">{selected.id.slice(0, 12)}...</h3>
                    <p className="text-xs text-slate-500">{selected.project} · {fmtFullTime(selected.mtime)}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setDetail(null) }} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-10 text-slate-500"><Sparkles className="h-4 w-4 animate-spin" /></div>
                  ) : detail ? (
                    detail.map((msg, i) => {
                      const p = msgPreview(msg)
                      const isUser = p.role === 'user'
                      return (
                        <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${isUser ? 'bg-sky-500/10' : 'bg-emerald-500/10'}`}>
                            {isUser ? <User className="h-3 w-3 text-sky-400" /> : <Bot className="h-3 w-3 text-emerald-400" />}
                          </div>
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 ${isUser ? 'bg-sky-500/10' : 'border border-slate-800/50 bg-slate-900/60'} ${msg.type === 'thinking' ? 'opacity-60 italic' : ''}`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-medium text-slate-500">{p.role}</span>
                              {msg.type === 'thinking' && <span className="text-[10px] text-amber-400/70">思考中...</span>}
                            </div>
                            <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-6">{p.text || '(empty)'}</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-600">无法加载详情</div>
                  )}
                  {detail && detail.length === 0 && (
                    <div className="py-10 text-center text-xs text-slate-600">空会话</div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-slate-800/50 text-[10px] text-slate-600">
                  共 {detail?.length || 0} 条消息
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
