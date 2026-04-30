import { useState, useEffect, useCallback } from 'react'
import {
  ListChecks,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Clock,
  Trash2,
  Send,
  Calendar,
  X,
  RefreshCw,
  Columns3,
  List,
  CalendarX,
  Pause,
} from 'lucide-react'
import { fetchTasks, createTask, updateTaskStatus, deleteTask, executeTask, fetchTaskDetail, updateTaskSchedule } from '../api'
import type { TaskItem, TaskDetail } from '../types'

const statusLabels: Record<string, string> = {
  in_progress: '进行中',
  completed: '已完成',
  pending: '待处理',
  failed: '失败',
}

const statusColors: Record<string, string> = {
  in_progress: 'text-amber-400 bg-amber-400/10 ring-amber-500/30',
  completed: 'text-emerald-400 bg-emerald-400/10 ring-emerald-500/30',
  pending: 'text-slate-500 bg-slate-500/10 ring-slate-500/30',
  failed: 'text-red-400 bg-red-400/10 ring-red-500/30',
}

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, TaskDetail>>({})
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [scheduleView, setScheduleView] = useState(false)

  // Form state
  const [formSubject, setFormSubject] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formSchedule, setFormSchedule] = useState('')
  const [formStatus, setFormStatus] = useState('pending')
  const [submitting, setSubmitting] = useState(false)

  const loadTasks = useCallback(() => {
    fetchTasks()
      .then(t => {
        const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, failed: 3 }
        setTasks(t.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9)))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Add batch execute listener (polling every 8s to pick up external changes)
  useEffect(() => {
    const timer = setInterval(loadTasks, 8000)
    return () => clearInterval(timer)
  }, [loadTasks])

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!details[id]) {
      try {
        const detail = await fetchTaskDetail(id)
        setDetails(prev => ({ ...prev, [id]: detail }))
      } catch {}
    }
  }

  const handleCreate = async () => {
    if (!formSubject.trim()) return
    setSubmitting(true)
    try {
      await createTask({
        subject: formSubject,
        description: formDesc,
        status: formStatus,
        scheduledAt: formSchedule || null,
      })
      setFormSubject('')
      setFormDesc('')
      setFormSchedule('')
      setFormStatus('pending')
      setShowForm(false)
      loadTasks()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateTaskStatus(id, status)
      loadTasks()
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id)
      if (expanded === id) setExpanded(null)
      loadTasks()
    } catch {}
  }

  const handleExecute = async (id: string) => {
    try {
      await executeTask(id)
    } catch {}
  }

  const handleBatchStatus = async (status: string) => {
    for (const id of selectedTasks) {
      await updateTaskStatus(id, status).catch(() => {})
    }
    setSelectedTasks(new Set())
    loadTasks()
  }

  const handleBatchDelete = async () => {
    for (const id of selectedTasks) {
      await deleteTask(id).catch(() => {})
    }
    setSelectedTasks(new Set())
    loadTasks()
  }

  const toggleSelect = (id: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedTasks.size === filtered.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filtered.map(t => t.id)))
    }
  }

  const filtered = tasks.filter(t => {
    if (scheduleView && !t.schedule?.scheduledAt) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <ListChecks className="h-6 w-6 text-emerald-400" />
            任务
          </h1>
          <p className="mt-1 text-sm text-slate-500">共 {tasks.length} 个任务</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-all hover:bg-emerald-500/20"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? '取消' : '新建任务'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-medium text-slate-300">创建新任务</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="任务标题"
              value={formSubject}
              onChange={e => setFormSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            />
            <textarea
              placeholder="任务描述（可选）"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <input
                  type="datetime-local"
                  value={formSchedule}
                  onChange={e => setFormSchedule(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleCreate}
                disabled={submitting || !formSubject.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-400 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Batch Ops */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedTasks.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
              />
              <span className="text-[10px] text-slate-500">
                {selectedTasks.size > 0 ? `${selectedTasks.size}/${filtered.length}` : '全选'}
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-1.5">
            {['all', 'in_progress', 'pending', 'completed', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'
              }`}
            >
              {s === 'all' ? '全部' : statusLabels[s] || s}
            </button>
          ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/40 p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md p-1.5 transition-all ${viewMode === 'list' ? 'bg-slate-700/60 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="列表"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`rounded-md p-1.5 transition-all ${viewMode === 'kanban' ? 'bg-slate-700/60 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="看板"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Schedule toggle */}
          <button
            onClick={() => setScheduleView(!scheduleView)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              scheduleView
                ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Calendar className="h-3 w-3" />
            定时
            {tasks.filter(t => t.schedule?.scheduledAt).length > 0 && (
              <span className="rounded bg-slate-800/60 px-1 py-0.5 text-[10px]">{tasks.filter(t => t.schedule?.scheduledAt).length}</span>
            )}
          </button>
        </div>
        {selectedTasks.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{selectedTasks.size} 个已选</span>
            {['pending', 'in_progress', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => handleBatchStatus(s)}
                className="rounded-lg bg-slate-800/60 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700/60"
              >
                {statusLabels[s]}
              </button>
            ))}
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
          </div>
        )}
      </div>

      {/* List View */}
      {viewMode === 'list' ? (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ListChecks className="mb-3 h-10 w-10 text-slate-700" />
            <p>暂无任务</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300">
              + 创建一个
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <div key={task.id} className="overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm transition-all hover:border-slate-700/50">
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox for batch */}
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => toggleSelect(task.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
                  />

                  {/* Expand */}
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="shrink-0"
                  >
                    {expanded === task.id
                      ? <ChevronDown className="h-4 w-4 text-slate-500" />
                      : <ChevronRight className="h-4 w-4 text-slate-500" />
                    }
                  </button>

                  {/* Status */}
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${statusColors[task.status] || statusColors.pending}`}>
                    {statusLabels[task.status] || task.status}
                  </span>

                  {/* Subject */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">{task.subject}</p>
                    {task.description && (
                      <p className="truncate text-xs text-slate-500">{task.description}</p>
                    )}
                    {task.schedule?.scheduledAt && (
                      <div className="mt-0.5 flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-amber-400/70" />
                        <span className="text-[10px] text-amber-400/70">
                          {new Date(task.schedule.scheduledAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {task.schedule.paused ? ' (已暂停)' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {task.schedule?.scheduledAt && (
                      <>
                        {task.schedule?.paused ? (
                          <button
                            onClick={() => updateTaskSchedule(task.id, 'resume').then(loadTasks)}
                            title="恢复定时"
                            className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateTaskSchedule(task.id, 'pause').then(loadTasks)}
                            title="暂停定时"
                            className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-amber-500/10 hover:text-amber-400"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => updateTaskSchedule(task.id, 'cancel').then(loadTasks)}
                          title="取消定时"
                          className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                        >
                          <CalendarX className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {task.status !== 'completed' && (
                      <>
                        <button
                          onClick={() => handleExecute(task.id)}
                          title="在 Claude Code 中执行"
                          className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'in_progress')}
                            title="标记进行中"
                            className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-amber-500/10 hover:text-amber-400"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange(task.id, 'completed')}
                        title="标记完成"
                        className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      title="删除"
                      className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === task.id && details[task.id] && (
                  <div className="border-t border-slate-800/50 px-4 py-3 space-y-2">
                    {details[task.id].items.map((item, i) => (
                      <div key={item.id} className="rounded-lg bg-slate-800/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs text-slate-500">#{i + 1}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                            item.status === 'completed' ? 'text-emerald-400 bg-emerald-400/10'
                            : item.status === 'in_progress' ? 'text-amber-400 bg-amber-400/10'
                            : 'text-slate-500 bg-slate-500/10'
                          }`}>
                            {statusLabels[item.status] || item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-200">{item.subject}</p>
                        {item.description && <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Kanban View ── */
        <div>
          {selectedTasks.size > 0 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xs text-slate-500">{selectedTasks.size} 个已选</span>
              {['pending', 'in_progress', 'completed'].map(s => (
                <button key={s} onClick={() => handleBatchStatus(s)}
                  className="rounded-lg bg-slate-800/60 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700/60">
                  {statusLabels[s]}
                </button>
              ))}
              <button onClick={handleBatchDelete}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20">
                <Trash2 className="h-3 w-3" />删除
              </button>
            </div>
          )}
          <div className="grid grid-cols-4 gap-4">
          {['pending', 'in_progress', 'completed', 'failed'].map(col => {
            const colTasks = tasks.filter(t => t.status === col)
            return (
              <div key={col} className="flex flex-col rounded-xl border border-slate-800/50 bg-slate-900/20 backdrop-blur-sm">
                <div className={`flex items-center gap-2 border-b border-slate-800/50 px-3 py-2.5 ${
                  col === 'in_progress' ? 'text-amber-400' :
                  col === 'completed' ? 'text-emerald-400' :
                  col === 'failed' ? 'text-red-400' :
                  'text-slate-400'
                }`}>
                  <span className="text-xs font-medium">{statusLabels[col] || col}</span>
                  <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-500">{colTasks.length}</span>
                </div>
                <div className="flex-1 space-y-2 p-2 min-h-[200px]">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-800/50 bg-slate-900/60 p-3 transition-all hover:border-slate-700/50 hover:bg-slate-900/80 cursor-pointer"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={e => { e.stopPropagation(); toggleSelect(task.id) }}
                          onClick={e => e.stopPropagation()}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 line-clamp-2">{task.subject}</p>
                        </div>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {task.status !== 'completed' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleExecute(task.id) }}
                            className="rounded p-1 text-slate-500 hover:text-emerald-400"
                            title="执行"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        )}
                        {task.status === 'pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'in_progress') }}
                            className="rounded p-1 text-slate-500 hover:text-amber-400"
                            title="开始"
                          >
                            <Clock className="h-3 w-3" />
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'completed') }}
                            className="rounded p-1 text-slate-500 hover:text-emerald-400"
                            title="完成"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                        {/* Quick status change */}
                        {col !== 'pending' && col !== 'failed' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'pending') }}
                            className="rounded p-1 text-slate-600 hover:text-slate-400"
                            title="移回待处理"
                          >
                            ←
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(task.id) }}
                          className="ml-auto rounded p-1 text-slate-600 hover:text-red-400"
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-xs text-slate-700">
                      暂无任务
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      )}
    </div>
  )
}
