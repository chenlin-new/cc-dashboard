import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Brain, ArrowRight, Sparkles, Plus, X, Save, Trash2 } from 'lucide-react'
import { fetchMemories, createMemory, deleteMemory } from '../api'
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
  const [searchParams] = useSearchParams()
  const filterProject = searchParams.get('project') || ''

  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [formProject, setFormProject] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('user')
  const [formContent, setFormContent] = useState('')
  const [creating, setCreating] = useState(false)

  const loadMemories = () => {
    fetchMemories()
      .then(setMemories)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMemories() }, [])

  const handleCreate = async () => {
    if (!formProject.trim() || !formName.trim()) return
    setCreating(true)
    try {
      await createMemory({
        project: formProject.trim(),
        filename: formName.trim(),
        name: formName.trim(),
        description: formDesc.trim(),
        type: formType,
        content: formContent,
      })
      setShowForm(false)
      setFormProject(''); setFormName(''); setFormDesc(''); setFormContent('')
      loadMemories()
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const handleDelete = async (mem: MemoryItem) => {
    if (!confirm(`确定删除记忆「${mem.name}」？`)) return
    try {
      await deleteMemory(mem.project, mem.filename)
      loadMemories()
    } catch {}
  }

  // Deduplicate project names from memories
  const projects = [...new Set(memories.map(m => m.project))]

  const types = ['all', ...new Set(memories.map(m => m.type))]

  const filtered = memories.filter(m => {
    if (filterProject && m.project !== filterProject) return false
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Brain className="h-6 w-6 text-sky-400" />
            记忆
            {filterProject && (
              <span className="flex items-center gap-1 text-sm font-normal text-slate-500">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sky-400">{filterProject.replace(/^-/, '').replace(/-/g, '/').split('/').filter(Boolean).pop()}</span>
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {filtered.length} 条记忆{filterProject ? '（已按项目过滤）' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-400 ring-1 ring-sky-500/30 transition-all hover:bg-sky-500/20"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? '取消' : '新建记忆'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-sky-500/20 bg-slate-900/50 p-5 backdrop-blur-sm space-y-3">
          <h2 className="text-sm font-medium text-slate-300">创建新记忆</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">项目 *</label>
              <input value={formProject} onChange={e => setFormProject(e.target.value)}
                placeholder="例: -Users-lin-Desktop-pms"
                list="project-list"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500/50 focus:outline-none"
              />
              <datalist id="project-list">
                {projects.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">文件名 *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)}
                placeholder="例: my-rule"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">描述</label>
              <input value={formDesc} onChange={e => setFormDesc(e.target.value)}
                placeholder="简要说明这条记忆的用途"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">类型</label>
              <select value={formType} onChange={e => setFormType(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-500/50 focus:outline-none"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">内容</label>
            <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
              placeholder="记忆的具体内容..."
              rows={4}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500/50 focus:outline-none resize-none"
            />
          </div>
          <button onClick={handleCreate} disabled={creating || !formProject.trim() || !formName.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      )}

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
            <MemoryCard key={`${memory.project}-${memory.filename}`} memory={memory} onDelete={() => handleDelete(memory)} />
          ))}
        </div>
      )}
    </div>
  )
}
