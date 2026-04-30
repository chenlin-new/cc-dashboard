import { useState, useEffect } from 'react'
import {
  Puzzle,
  Sparkles,
  Package,
  Folder,
  Clock,
  GitCommit,
  Tag,
  Globe,
  Search,
  Download,
  ExternalLink,
  X,
  Store,
  Check,
  User,
} from 'lucide-react'
import { fetchPlugins, searchPluginMarketplace, installPlugin } from '../api'
import type { PluginInfo, PluginEntry, MarketplaceItem } from '../types'

export default function PluginsPage() {
  const [data, setData] = useState<PluginInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'user' | 'project'>('all')
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')

  // Marketplace state
  const [marketSearch, setMarketSearch] = useState('')
  const [marketResults, setMarketResults] = useState<MarketplaceItem[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketSearched, setMarketSearched] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installMsg, setInstallMsg] = useState('')

  useEffect(() => {
    fetchPlugins()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Load initial marketplace results
  useEffect(() => {
    searchPluginMarketplace('')
      .then(d => { setMarketResults(d.results); setMarketSearched(true) })
      .catch(() => {})
  }, [])

  const handleMarketSearch = async () => {
    setMarketLoading(true)
    try {
      const d = await searchPluginMarketplace(marketSearch)
      setMarketResults(d.results)
      setMarketSearched(true)
    } catch {}
    setMarketLoading(false)
  }

  const handleInstall = async (item: MarketplaceItem) => {
    setInstalling(item.name)
    setInstallMsg('')
    try {
      const result = await installPlugin(item.name)
      if (result.installed) {
        setInstallMsg(`✓ ${item.name} 安装成功`)
        // Refresh plugin list
        const updated = await fetchPlugins()
        setData(updated)
        setTimeout(() => setInstallMsg(''), 5000)
      }
    } catch (e: any) {
      setInstallMsg(`✗ 安装失败: ${e.message}`)
    }
    setInstalling(null)
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

  const pluginMap = data?.plugins?.plugins || {}
  const entries = Object.entries(pluginMap)
  const filtered = filter === 'all'
    ? entries
    : entries.filter(([_, plugins]) => plugins.some(p => p.scope === filter))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Puzzle className="h-6 w-6 text-indigo-400" />
          插件
        </h1>
        <p className="mt-1 text-sm text-slate-500">共 {entries.length} 个已安装插件</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/50 pb-3">
        <button onClick={() => setTab('installed')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${tab === 'installed' ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'}`}>
          <Package className="h-3.5 w-3.5" />已安装
        </button>
        <button onClick={() => setTab('marketplace')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${tab === 'marketplace' ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'}`}>
          <Store className="h-3.5 w-3.5" />市场
        </button>
      </div>

      {/* Install notification */}
      {installMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm backdrop-blur-sm ${installMsg.startsWith('✓') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {installMsg}
        </div>
      )}

      {tab === 'marketplace' ? (
        /* ─── Marketplace ─── */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input value={marketSearch} onChange={e => setMarketSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMarketSearch()}
                placeholder="搜索 Claude Code 插件..."
                className="w-full rounded-lg border border-slate-800/50 bg-slate-900/30 px-9 py-2 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20" />
              {marketSearch && (
                <button onClick={() => { setMarketSearch(''); setMarketResults([]); setMarketSearched(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button onClick={handleMarketSearch} disabled={marketLoading}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-400 disabled:opacity-40">
              {marketLoading ? <Sparkles className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              搜索
            </button>
          </div>

          {marketLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Sparkles className="h-5 w-5 animate-spin mr-2" />搜索中...
            </div>
          ) : marketResults.length === 0 ? (
            marketSearched && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Store className="mb-3 h-10 w-10 text-slate-700" />
                <p>未找到匹配的插件</p>
                <p className="text-xs text-slate-600 mt-1">尝试其他搜索词</p>
              </div>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {marketResults.map((item) => (
                <div key={item.name} className="group rounded-xl border border-slate-800/50 bg-slate-900/40 p-4 backdrop-blur-sm transition-all hover:border-indigo-500/30">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-200 truncate">{item.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description || '暂无描述'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-600">{item.publisher}</span>
                        <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500">{item.version}</span>
                        {item.keywords?.slice(0, 3).map(k => (
                          <span key={k} className="rounded bg-slate-800/30 px-1.5 py-0.5 text-[10px] text-slate-600">{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-800/30 pt-3">
                    <button onClick={() => handleInstall(item)} disabled={installing === item.name}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40">
                      {installing === item.name
                        ? <><Sparkles className="h-3 w-3 animate-spin" />安装中...</>
                        : <><Download className="h-3 w-3" />安装</>
                      }
                    </button>
                    {item.links?.npm && (
                      <a href={item.links.npm} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-all hover:bg-slate-800/40 hover:text-slate-300">
                        <ExternalLink className="h-3 w-3" />NPM
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Installed ─── */
        <>
          {/* Filter */}
          <div className="flex items-center gap-1.5">
            {['all', 'user', 'project'].map(s => (
              <button key={s} onClick={() => setFilter(s as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === s ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'
                }`}>
                {s === 'all' ? '全部' : s === 'user' ? '用户级' : '项目级'}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Puzzle className="mb-3 h-10 w-10 text-slate-700" />
              <p>暂无插件</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map(([name, plugins]) => {
                const p = plugins[0]
                const formatTime = (t?: string) => {
                  if (!t) return '未知'
                  return new Date(t).toLocaleString('zh-CN', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                }
                return (
                  <div key={name} className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-5 backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-200">{name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-1.5 py-0.5 text-xs ${
                            p.scope === 'user'
                              ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30'
                              : 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
                          }`}>
                            {p.scope === 'user' ? '用户级' : '项目级'}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-slate-500">
                            <Tag className="h-3 w-3" />{p.version}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-800/30 pt-3">
                      {p.scope === 'project' && p.projectPath && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Folder className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.projectPath}</span>
                        </div>
                      )}
                      {p.installPath && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Folder className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.installPath}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{formatTime(p.installedAt)}</span>
                      </div>
                      {p.lastUpdated && p.lastUpdated !== p.installedAt && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>更新于 {formatTime(p.lastUpdated)}</span>
                        </div>
                      )}
                      {p.gitCommitSha && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <GitCommit className="h-3 w-3 shrink-0" />
                          <span className="font-mono">{p.gitCommitSha.slice(0, 7)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
