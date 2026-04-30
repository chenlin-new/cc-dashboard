import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, ListChecks, Wrench, Sparkles, Activity, Cpu, Puzzle, Radio,
  Terminal, BarChart3, FolderTree, MessageSquare,
} from 'lucide-react'
import { fetchStats, launchCc, fetchProjectStats, fetchChartStats } from '../api'
import type { Stats } from '../types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const typeLabels: Record<string, string> = {
  user: '用户', feedback: '反馈', project: '项目', reference: '参考',
}

const statusLabels: Record<string, string> = {
  in_progress: '进行中', completed: '已完成', pending: '待处理', failed: '失败',
}

const statusColors: Record<string, string> = {
  in_progress: 'text-amber-400 bg-amber-400/10',
  completed: 'text-emerald-400 bg-emerald-400/10',
  pending: 'text-slate-400 bg-slate-400/10',
  failed: 'text-red-400 bg-red-400/10',
}

const typeColors: Record<string, string> = {
  user: 'text-purple-400 bg-purple-400/10',
  feedback: 'text-rose-400 bg-rose-400/10',
  project: 'text-sky-400 bg-sky-400/10',
  reference: 'text-emerald-400 bg-emerald-400/10',
}

const CHART_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb923c']
const PIE_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399']

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [launchMsg, setLaunchMsg] = useState('')
  const [projectStats, setProjectStats] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
    fetchProjectStats().then(setProjectStats).catch(() => {})
    fetchChartStats().then(setChartData).catch(() => {})
  }, [])

  const handleLaunch = async () => {
    setLaunching(true)
    setLaunchMsg('')
    try {
      const res = await launchCc()
      setLaunchMsg(res.launched ? 'Claude Code 已启动' : `启动失败: ${res.error}`)
    } catch (e: any) {
      setLaunchMsg(`启动失败: ${e.message}`)
    } finally {
      setLaunching(false)
      setTimeout(() => setLaunchMsg(''), 4000)
    }
  }

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

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500">
        无法加载数据，请确保 Claude Code 已运行过
      </div>
    )
  }

  const memoryPie = Object.entries(stats.memoryByType).map(([k, v]) => ({ name: typeLabels[k] || k, value: v }))
  const taskBar = Object.entries(stats.taskByStatus).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }))

  return (
    <div className="space-y-8">
      {/* Header with Launch CC */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">概览</h1>
          <p className="mt-1 text-sm text-slate-500">Claude Code 本地数据一览</p>
        </div>
        <div className="flex items-center gap-3">
          {launchMsg && (
            <span className={`text-xs ${launchMsg.includes('已启动') ? 'text-emerald-400' : 'text-red-400'}`}>
              {launchMsg}
            </span>
          )}
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <Terminal className={`h-4 w-4 ${launching ? 'animate-spin' : ''}`} />
            {launching ? '启动中...' : '启动 CC'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard to="/memory" icon={Brain} value={stats.memoryCount} label="记忆" color="sky">
          {stats.memoryCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(stats.memoryByType).map(([type, count]) => (
                <span key={type} className={`rounded-full px-2 py-0.5 text-xs ${typeColors[type] || 'text-slate-400 bg-slate-400/10'}`}>
                  {typeLabels[type] || type} {count}
                </span>
              ))}
            </div>
          )}
        </StatCard>
        <StatCard to="/tasks" icon={ListChecks} value={stats.taskCount} label="任务" color="emerald">
          {stats.taskCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(stats.taskByStatus).map(([status, count]) => (
                <span key={status} className={`rounded-full px-2 py-0.5 text-xs ${statusColors[status] || 'text-slate-400 bg-slate-400/10'}`}>
                  {statusLabels[status] || status} {count}
                </span>
              ))}
            </div>
          )}
        </StatCard>
        <StatCard to="/agents" icon={Radio} value={stats.taskCount} label="Agent" color="emerald" />
        <StatCard to="/mcp" icon={Cpu} value={stats.mcpServerCount} label="MCP" color="sky" />
        <StatCard to="/plugins" icon={Puzzle} value={stats.pluginCount} label="插件" color="purple" />
      </div>

      {/* Charts Row */}
      {(memoryPie.length > 0 || taskBar.length > 0 || chartData.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Memory type pie */}
          {memoryPie.length > 0 && (
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-400">记忆类型分布</h3>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={memoryPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {memoryPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                {memoryPie.map((entry, i) => (
                  <span key={entry.name} className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {entry.name} {entry.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Task status bar */}
          {taskBar.length > 0 && (
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-400">任务状态分布</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={taskBar}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {taskBar.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 7-day trend line */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-400">近 7 天活动</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="sessions" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 3 }} />
                  <Line type="monotone" dataKey="tasks" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" /> 会话</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-purple-400" /> 任务</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Aggregation */}
      {projectStats.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
            <FolderTree className="h-4 w-4" />
            项目统计
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/50 text-xs text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">项目</th>
                    <th className="px-4 py-3 text-center font-medium">记忆</th>
                    <th className="px-4 py-3 text-center font-medium">任务</th>
                    <th className="px-4 py-3 text-center font-medium">技能</th>
                    <th className="px-4 py-3 text-center font-medium">记忆类型</th>
                  </tr>
                </thead>
                <tbody>
                  {projectStats.map((p) => (
                    <tr key={p.project} className="border-b border-slate-800/30 transition-colors hover:bg-slate-800/20">
                      <td className="px-4 py-3 text-slate-200 font-medium">{p.project}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{p.memoryCount}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{p.taskCount}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{p.skillCount || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-1">
                          {Object.entries(p.memoryByType as Record<string, number>).map(([type, count]) => (
                            <span key={type} className={`rounded-full px-1.5 py-0.5 text-xs ${typeColors[type] || 'text-slate-400 bg-slate-400/10'}`}>
                              {typeLabels[type] || type} {count}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
          <Activity className="h-4 w-4" />
          快捷入口
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <QuickLink to="/chat" icon={MessageSquare} label="对话 Claude" desc="与 Claude 实时聊天" color="emerald" />
          <QuickLink to="/memory" icon={Brain} label="浏览记忆" desc="查看所有项目的记忆数据" color="sky" />
          <QuickLink to="/tasks" icon={ListChecks} label="管理任务" desc="创建、执行、定时任务" color="emerald" />
          <QuickLink to="/agents" icon={Radio} label="追踪 Agent" desc="实时查看 Agent 活动" color="emerald" />
          <QuickLink to="/sessions" icon={BarChart3} label="会话时间轴" desc="查看所有会话历史" color="sky" />
          <QuickLink to="/mcp" icon={Cpu} label="MCP 服务器" desc="查看 MCP 配置和状态" color="sky" />
          <QuickLink to="/plugins" icon={Puzzle} label="已安装插件" desc="查看所有 CC 插件" color="purple" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ to, icon: Icon, value, label, children, color }: {
  to: string; icon: any; value: number; label: string; color: string; children?: React.ReactNode
}) {
  const borderMap: Record<string, string> = {
    sky: 'hover:border-sky-500/30 hover:shadow-sky-500/5',
    emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
    purple: 'hover:border-purple-500/30 hover:shadow-purple-500/5',
  }
  const bgMap: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }
  return (
    <Link to={to} className={`group rounded-xl border border-slate-800/50 bg-slate-900/40 p-5 backdrop-blur-sm transition-all ${borderMap[color] || borderMap.sky} hover:bg-slate-900/60 hover:shadow-lg`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">{value}</p>
          <p className="text-sm text-slate-400">{label}</p>
        </div>
      </div>
      {children}
    </Link>
  )
}

function QuickLink({ to, icon: Icon, label, desc, color }: {
  to: string; icon: any; label: string; desc: string; color: string
}) {
  const borderMap: Record<string, string> = {
    sky: 'hover:border-sky-500/30 hover:shadow-sky-500/5',
    emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
    purple: 'hover:border-purple-500/30 hover:shadow-purple-500/5',
  }
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 backdrop-blur-sm transition-all hover:bg-slate-900/50 hover:shadow-lg ${borderMap[color] || borderMap.sky}`}
    >
      <Icon className="h-5 w-5 text-slate-400" />
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </Link>
  )
}
