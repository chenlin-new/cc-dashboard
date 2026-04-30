import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Radio,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Circle,
  Play,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ExternalLink,
  Activity,
  GitBranch,
  List,
} from 'lucide-react'
import { fetchAgents, fetchTaskDetail, subscribeAgentEvents } from '../api'
import type { AgentInfo } from '../types'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  in_progress: { label: '运行中', color: 'text-emerald-400 bg-emerald-400/10 ring-emerald-500/30', icon: Play },
  completed: { label: '已完成', color: 'text-sky-400 bg-sky-400/10 ring-sky-500/30', icon: CheckCircle2 },
  pending: { label: '待处理', color: 'text-amber-400 bg-amber-400/10 ring-amber-500/30', icon: Clock },
  failed: { label: '失败', color: 'text-red-400 bg-red-400/10 ring-red-500/30', icon: XCircle },
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [agentDetails, setAgentDetails] = useState<Record<string, any>>({})
  const [events, setEvents] = useState<{ type: string; data: any; time: string }[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [viewMode, setViewMode] = useState<'tree' | 'dag'>('tree')
  const eventsEndRef = useRef<HTMLDivElement>(null)

  // Initial load
  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // SSE subscription for real-time updates
  useEffect(() => {
    const unsubscribe = subscribeAgentEvents((event, data) => {
      if (event === 'agent_created' || event === 'agent_updated' || event === 'agent_removed') {
        setIsLive(true)
        setTimeout(() => setIsLive(false), 2000)
        // Re-fetch agents on change
        fetchAgents().then(setAgents).catch(console.error)
      }
      const time = new Date().toLocaleTimeString()
      setEvents(prev => [{ type: event, data, time }, ...prev].slice(0, 50))
    })
    return unsubscribe
  }, [])

  // Auto scroll events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  // Auto refresh polling
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      fetchAgents().then(setAgents).catch(console.error)
    }, 5000)
    return () => clearInterval(timer)
  }, [autoRefresh])

  const toggleExpand = useCallback(async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!agentDetails[id]) {
      try {
        const detail = await fetchTaskDetail(id)
        setAgentDetails(prev => ({ ...prev, [id]: detail }))
      } catch {}
    }
  }, [expanded, agentDetails])

  const refreshNow = () => {
    fetchAgents().then(setAgents).catch(console.error)
  }

  const activeCount = agents.filter(a => a.status === 'in_progress').length

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
            <Radio className={`h-6 w-6 ${isLive ? 'text-emerald-400' : 'text-sky-400'}`} />
            Agent 追踪
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {activeCount} 个 Agent 正在运行 · 共 {agents.length} 个
              </span>
            ) : (
              `共 ${agents.length} 个 Agent`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/40 p-0.5 mr-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`rounded-md p-1.5 transition-all ${viewMode === 'tree' ? 'bg-slate-700/60 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="树形"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('dag')}
              className={`rounded-md p-1.5 transition-all ${viewMode === 'dag' ? 'bg-slate-700/60 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="拓扑图"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              autoRefresh
                ? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
                : 'text-slate-500 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="h-3 w-3" />
            自动刷新
          </button>
          <button
            onClick={refreshNow}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200"
          >
            <RefreshCw className="h-3 w-3" />
            刷新
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Radio className="mb-3 h-10 w-10 text-slate-700" />
          <p>暂无 Agent 活动</p>
          <p className="mt-1 text-xs text-slate-600">当 Claude Code 执行多步骤任务时，Agent 信息会实时显示在这里</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Agent List – tree or DAG */}
          {viewMode === 'tree' ? (
          <div className="lg:col-span-2 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <Radio className="h-4 w-4" />
              Agent 列表
              {agents.length > 0 && (
                <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-500">{agents.length}</span>
              )}
            </h2>

            <div className="space-y-2">
              {agents.map((agent) => {
                const cfg = statusConfig[agent.status] || statusConfig.pending
                const Icon = cfg.icon
                return (
                  <div
                    key={agent.id}
                    className={`overflow-hidden rounded-xl border transition-all ${
                      agent.status === 'in_progress'
                        ? 'border-emerald-500/30 bg-slate-900/50 shadow-sm shadow-emerald-500/5'
                        : 'border-slate-800/50 bg-slate-900/30 hover:border-slate-700/50'
                    } backdrop-blur-sm`}
                  >
                    <button
                      onClick={() => toggleExpand(agent.id)}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-800/30"
                    >
                      {expanded === agent.id ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {agent.subject || '未命名任务'}
                        </p>
                        {agent.activeForm && (
                          <p className="mt-0.5 text-xs text-slate-400">{agent.activeForm}</p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="hidden sm:block shrink-0 text-xs text-slate-600 font-mono">
                        {agent.id.slice(0, 8)}
                      </span>
                    </button>

                    {expanded === agent.id && agentDetails[agent.id] && (
                      <div className="border-t border-slate-800/50 px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <Circle className="h-1.5 w-1.5 fill-sky-400 text-sky-400" />
                          <span className="text-xs font-medium text-slate-500">子任务 / 步骤</span>
                        </div>
                        {agentDetails[agent.id].items.map((item: any, i: number) => {
                          const itemCfg = statusConfig[item.status] || statusConfig.pending
                          const ItemIcon = itemCfg.icon
                          return (
                            <div key={item.id} className="ml-3 rounded-lg border border-slate-800/50 bg-slate-800/20 p-3 transition-colors hover:bg-slate-800/40">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ItemIcon className={`h-3.5 w-3.5 shrink-0 ${
                                    item.status === 'completed' ? 'text-sky-400' :
                                    item.status === 'in_progress' ? 'text-emerald-400' :
                                    'text-slate-500'
                                  }`} />
                                  <span className="truncate text-sm text-slate-200">{item.subject}</span>
                                </div>
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${itemCfg.color}`}>
                                  {itemCfg.label}
                                </span>
                              </div>
                              {item.description && (
                                <p className="mt-1 ml-5.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          ) : (
          /* ── DAG View ── */
          <div className="lg:col-span-2 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <GitBranch className="h-4 w-4" />
              拓扑图
              {agents.length > 0 && (
                <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-500">{agents.length}</span>
              )}
            </h2>
            <div className="space-y-5">
              {agents.map((agent) => {
                const cfg = statusConfig[agent.status] || statusConfig.pending
                const Icon = cfg.icon
                const items = agentDetails[agent.id]?.items || []
                return (
                  <div key={agent.id} className="relative">
                    {/* Root agent node */}
                    <div
                      className={`relative z-10 rounded-xl border p-4 transition-all ${
                        agent.status === 'in_progress'
                          ? 'border-emerald-500/30 bg-slate-900/60 shadow-sm shadow-emerald-500/5'
                          : 'border-slate-800/50 bg-slate-900/30 hover:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200">{agent.subject || '未命名任务'}</p>
                          {agent.activeForm && <p className="mt-0.5 text-xs text-slate-400">{agent.activeForm}</p>}
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Child nodes connected by lines */}
                    {items.length > 0 && (
                      <div className="relative ml-4 mt-2 pl-8 border-l-2 border-slate-700/50 space-y-3">
                        {items.map((item: any, i: number) => {
                          const itemCfg = statusConfig[item.status] || statusConfig.pending
                          const ItemIcon = itemCfg.icon
                          const isLast = i === items.length - 1
                          return (
                            <div key={item.id || i} className="relative">
                              {/* Connector dot */}
                              <div className="absolute -left-[calc(2rem+5px)] top-4 flex items-center justify-center">
                                <div className={`h-2.5 w-2.5 rounded-full border-2 ${
                                  item.status === 'completed' ? 'border-sky-400 bg-sky-400' :
                                  item.status === 'in_progress' ? 'border-emerald-400 bg-emerald-400' :
                                  'border-slate-600 bg-slate-800'
                                }`} />
                              </div>
                              <div className="rounded-lg border border-slate-800/50 bg-slate-800/20 p-3 transition-colors hover:bg-slate-800/40">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ItemIcon className={`h-3.5 w-3.5 shrink-0 ${
                                      item.status === 'completed' ? 'text-sky-400' :
                                      item.status === 'in_progress' ? 'text-emerald-400' :
                                      'text-slate-500'
                                    }`} />
                                    <span className="truncate text-sm text-slate-200">{item.subject}</span>
                                  </div>
                                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${itemCfg.color}`}>
                                    {itemCfg.label}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="mt-1 ml-5.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {/* Event Stream Panel */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <Activity className="h-4 w-4" />
              实时事件流
              {events.length > 0 && (
                <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-500">{events.length}</span>
              )}
            </h2>

            <div className="h-[600px] overflow-y-auto rounded-xl border border-slate-800/50 bg-slate-900/30 p-3 backdrop-blur-sm">
              {events.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-xs text-slate-600">
                  等待事件...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {events.map((evt, i) => {
                    const colorMap: Record<string, string> = {
                      agent_created: 'text-emerald-400',
                      agent_updated: 'text-sky-400',
                      agent_removed: 'text-rose-400',
                      task_created: 'text-amber-400',
                      task_updated: 'text-sky-400',
                      task_deleted: 'text-rose-400',
                    }
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-slate-800/20 px-2.5 py-2 text-xs">
                        <Circle className={`mt-0.5 h-1.5 w-1.5 shrink-0 fill-current ${colorMap[evt.type] || 'text-slate-500'}`} />
                        <div className="min-w-0">
                          <span className="font-medium text-slate-300">{evt.type}</span>
                          <span className="text-slate-600"> — {evt.data.id?.slice(0, 8)}{evt.data.subject ? `: ${evt.data.subject.slice(0, 30)}` : ''}</span>
                          <div className="text-slate-600">{evt.time}</div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={eventsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
