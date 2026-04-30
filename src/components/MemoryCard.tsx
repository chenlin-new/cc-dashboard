import { Link } from 'react-router-dom'
import { Brain, FileText } from 'lucide-react'
import { Trash2 } from 'lucide-react'
import type { MemoryItem } from '../types'

const typeColors: Record<string, string> = {
  user: 'bg-purple-500/10 text-purple-400 ring-purple-500/30',
  feedback: 'bg-rose-500/10 text-rose-400 ring-rose-500/30',
  project: 'bg-sky-500/10 text-sky-400 ring-sky-500/30',
  reference: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
}

const typeLabels: Record<string, string> = {
  user: '用户',
  feedback: '反馈',
  project: '项目',
  reference: '参考',
  unknown: '未分类',
}

export default function MemoryCard({ memory, onDelete }: { memory: MemoryItem; onDelete?: () => void }) {
  const preview = memory.content
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
    .replace(/[#*`>\[\]]/g, '')
    .trim()
    .slice(0, 120)

  return (
    <Link
      to={`/memory/${encodeURIComponent(memory.project)}/${encodeURIComponent(memory.filename)}`}
      className="group flex flex-col rounded-xl border border-slate-800/50 bg-slate-900/40 p-5 backdrop-blur-sm transition-all hover:border-sky-500/30 hover:bg-slate-900/60 hover:shadow-lg hover:shadow-sky-500/5"
    >
      {/* Icon & Type */}
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 transition-colors group-hover:bg-sky-500/15">
          <Brain className="h-4 w-4" />
        </div>
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${typeColors[memory.type] || typeColors.unknown}`}>
          {typeLabels[memory.type] || memory.type}
        </span>
      </div>

      {/* Name & Description */}
      <div className="mt-4 flex-1 min-w-0">
        <h3 className="truncate text-sm font-semibold text-slate-200 transition-colors group-hover:text-sky-400">
          {memory.name}
        </h3>
        {memory.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {memory.description}
          </p>
        )}
      </div>

      {/* Preview & Footer */}
      <div className="mt-3">
        {preview && (
          <p className="text-xs leading-relaxed text-slate-600 line-clamp-2">
            {preview}...
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <FileText className="h-3 w-3" />
            <span className="truncate">{memory.filename}</span>
          </div>
          {onDelete && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
              className="rounded p-1 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              title="删除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
