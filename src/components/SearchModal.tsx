import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Brain, ListChecks, Wrench, ExternalLink, X } from 'lucide-react'
import { searchAll } from '../api'

const typeIcons: Record<string, any> = { memory: Brain, task: ListChecks, skill: Wrench }
const typeColors: Record<string, string> = { memory: 'text-sky-400', task: 'text-emerald-400', skill: 'text-purple-400' }
const typeBg: Record<string, string> = { memory: 'bg-sky-500/10', task: 'bg-emerald-500/10', skill: 'bg-purple-500/10' }

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQ(''); setResults([]) }
  }, [open])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      try { const res = await searchAll(q); setResults(res.results); setSelectedIdx(0) } catch {}
    }, 150)
    return () => clearTimeout(timer)
  }, [q])

  const goTo = useCallback((link: string) => {
    onClose(); navigate(link)
  }, [navigate, onClose])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) { goTo(results[selectedIdx].link) }
    if (e.key === 'Escape') { onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={handleKey}
              placeholder="搜索记忆、任务、技能..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-500">
              <X className="h-3 w-3" onClick={onClose} />
            </kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && q.trim() ? (
              <div className="py-8 text-center text-sm text-slate-600">无结果</div>
            ) : results.length === 0 ? null : (
              <div className="space-y-0.5">
                {results.map((r, i) => {
                  const Icon = typeIcons[r.type] || Search
                  return (
                    <button
                      key={`${r.type}-${r.title}-${i}`}
                      onClick={() => goTo(r.link)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                        i === selectedIdx ? 'bg-slate-800/60 ring-1 ring-slate-700/50' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md ${typeBg[r.type] || 'bg-slate-800'}`}>
                        <Icon className={`h-3.5 w-3.5 ${typeColors[r.type] || 'text-slate-400'}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">{r.title}</p>
                        {r.desc && <p className="truncate text-xs text-slate-500">{r.desc}</p>}
                      </div>
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-600" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-600">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5">↑↓</kbd> 导航 <kbd className="rounded bg-slate-800 px-1.5 py-0.5 ml-2">↵</kbd> 打开 <kbd className="rounded bg-slate-800 px-1.5 py-0.5 ml-2">Esc</kbd> 关闭
          </div>
        </div>
      </div>
    </div>
  )
}
