import { useState, useEffect } from 'react'
import { Search, Brain, ArrowRight, Sparkles } from 'lucide-react'
import { fetchMemories } from '../api'
import type { MemoryItem } from '../types'
import MemoryCard from '../components/MemoryCard'

const typeLabels: Record<string, string> = {
  user: '用户',
  feedback: '反馈',
  project: '项目',
  reference: '参考',
  unknown: '未分类',
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    fetchMemories()
      .then(setMemories)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const types = ['all', ...new Set(memories.map(m => m.type))]

  const filtered = memories.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-500">
          <Sparkles className="h-5 w-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Brain className="h-6 w-6 text-sky-400" />
          记忆
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {memories.length} 条记忆
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜索记忆..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-600 backdrop-blur-sm transition-all focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterType === type
                  ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'
              }`}
            >
              {type === 'all' ? '全部' : typeLabels[type] || type}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Brain className="mb-3 h-10 w-10 text-slate-700" />
          <p>暂无匹配的记忆</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((memory) => (
            <MemoryCard key={`${memory.project}-${memory.filename}`} memory={memory} />
          ))}
        </div>
      )}
    </div>
  )
}
