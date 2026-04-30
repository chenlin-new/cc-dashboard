import { useState, useEffect } from 'react'
import {
  Cpu,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Terminal,
  Globe,
  Key,
  ToggleLeft,
  ToggleRight,
  FileJson,
  Edit3,
  Save,
  X,
  AlertTriangle,
  Activity,
  Search,
  Download,
  Package as PackageIcon,
  ExternalLink,
  Check,
  Store,
  FolderPlus,
  Trash2,
} from 'lucide-react'
import { fetchMcpConfigs, saveMcpConfig, checkMcpHealth, searchMcpMarketplace, installMcpServer, fetchMcpCustomPaths, addMcpCustomPath, removeMcpCustomPath } from '../api'
import type { McpConfig, McpServer, MarketplaceItem } from '../types'

export default function McpPage() {
  const [configs, setConfigs] = useState<McpConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const [editingConfig, setEditingConfig] = useState<McpConfig | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [healthStatus, setHealthStatus] = useState<Record<string, Record<string, string>>>({})
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null)
  const [tab, setTab] = useState<'configs' | 'marketplace'>('configs')

  // Marketplace state
  const [marketSearch, setMarketSearch] = useState('')
  const [marketResults, setMarketResults] = useState<MarketplaceItem[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketSearched, setMarketSearched] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installMsg, setInstallMsg] = useState('')
  const [showInstallForm, setShowInstallForm] = useState<MarketplaceItem | null>(null)
  const [installName, setInstallName] = useState('')
  const [installProject, setInstallProject] = useState('')

  // Path management
  const [customPaths, setCustomPaths] = useState<string[]>([])
  const [newPathInput, setNewPathInput] = useState('')
  const [pathMsg, setPathMsg] = useState('')

  useEffect(() => {
    fetchMcpConfigs()
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false))
    fetchMcpCustomPaths()
      .then(d => setCustomPaths(d.paths))
      .catch(() => {})
  }, [])

  // Load initial marketplace results
  useEffect(() => {
    searchMcpMarketplace('')
      .then(d => { setMarketResults(d.results); setMarketSearched(true) })
      .catch(() => {})
  }, [])

  const startEditConfig = (cfg: McpConfig) => {
    setEditingConfig(cfg)
    setEditText(JSON.stringify(cfg.servers, null, 2))
    setEditError('')
    setSaveMsg('')
  }

  const cancelEditConfig = () => {
    setEditingConfig(null)
    setEditText('')
    setEditError('')
  }

  const handleSaveConfig = async () => {
    if (!editingConfig) return
    setEditError('')
    try {
      const parsed = JSON.parse(editText)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setEditError('必须是对象类型（MCP 服务器配置）')
        return
      }
      setSaving(true)
      await saveMcpConfig(editingConfig.path, parsed)
      setSaveMsg('success')
      cancelEditConfig()
      const updated = await fetchMcpConfigs()
      setConfigs(updated)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e: any) {
      setEditError(`JSON 解析错误: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleHealthCheck = async (cfg: McpConfig) => {
    setCheckingHealth(cfg.project)
    try {
      const result = await checkMcpHealth(cfg.path)
      setHealthStatus(prev => ({ ...prev, [cfg.path]: result }))
    } catch {
      setHealthStatus(prev => ({ ...prev, [cfg.path]: { _error: 'Connection failed' } }))
    } finally {
      setCheckingHealth(null)
    }
  }

  const handleMarketSearch = async () => {
    setMarketLoading(true)
    try {
      const data = await searchMcpMarketplace(marketSearch)
      setMarketResults(data.results)
      setMarketSearched(true)
    } catch {}
    setMarketLoading(false)
  }

  const handleAddPath = async () => {
    const p = newPathInput.trim()
    if (!p) return
    setPathMsg('')
    try {
      await addMcpCustomPath(p)
      setNewPathInput('')
      const [paths, configs] = await Promise.all([fetchMcpCustomPaths(), fetchMcpConfigs()])
      setCustomPaths(paths.paths)
      setConfigs(configs)
      setPathMsg(`✓ 已添加路径: ${p}`)
      setTimeout(() => setPathMsg(''), 3000)
    } catch { setPathMsg('✗ 添加失败') }
  }

  const handleRemovePath = async (p: string) => {
    setPathMsg('')
    try {
      await removeMcpCustomPath(p)
      const [paths, configs] = await Promise.all([fetchMcpCustomPaths(), fetchMcpConfigs()])
      setCustomPaths(paths.paths)
      setConfigs(configs)
      setPathMsg(`已移除: ${p}`)
      setTimeout(() => setPathMsg(''), 3000)
    } catch {}
  }

  const handleInstall = async (item: MarketplaceItem) => {
    const name = installName || item.name.split('/').pop() || item.name
    setInstalling(item.name)
    setInstallMsg('')
    try {
      const result = await installMcpServer(name, item.name, installProject || undefined)
      if (result.installed) {
        setInstallMsg(`✓ ${name} 已安装到 ${result.path}`)
        setShowInstallForm(null)
        setInstallName('')
        setInstallProject('')
        // Refresh configs
        const updated = await fetchMcpConfigs()
        setConfigs(updated)
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

  const totalServers = configs.reduce((acc, cfg) => acc + Object.keys(cfg.servers).length, 0)
  const activeServers = configs.reduce((acc, cfg) =>
    acc + Object.values(cfg.servers).filter((s: McpServer) => !s._disabled).length, 0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Cpu className="h-6 w-6 text-sky-400" />
            MCP 服务器
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeServers}/{totalServers} 个服务器启用 · 来自 {configs.length} 个配置
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/50 pb-3">
        <button onClick={() => setTab('configs')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${tab === 'configs' ? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'}`}>
          <FileJson className="h-3.5 w-3.5" />已安装
        </button>
        <button onClick={() => setTab('marketplace')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${tab === 'marketplace' ? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'}`}>
          <Store className="h-3.5 w-3.5" />市场
        </button>
      </div>

      {/* Save notification */}
      {saveMsg === 'success' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 backdrop-blur-sm">
          MCP 配置已保存，重启 MCP 服务器后生效
        </div>
      )}

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
                placeholder="搜索 MCP 服务器..."
                className="w-full rounded-lg border border-slate-800/50 bg-slate-900/30 px-9 py-2 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20" />
              {marketSearch && (
                <button onClick={() => { setMarketSearch(''); setMarketResults([]); setMarketSearched(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button onClick={handleMarketSearch} disabled={marketLoading}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-sky-400 disabled:opacity-40">
              {marketLoading ? <Sparkles className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              搜索
            </button>
          </div>

          {/* Install form popup */}
          {showInstallForm && (
            <div className="rounded-xl border border-sky-500/30 bg-slate-900/50 p-5 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-slate-200 mb-3">安装 {showInstallForm.name}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">服务器名称</label>
                  <input value={installName} onChange={e => setInstallName(e.target.value)}
                    placeholder={showInstallForm.name.split('/').pop() || showInstallForm.name}
                    className="w-full rounded-lg border border-slate-800/50 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">目标项目路径（可选，留空则安装到全局）</label>
                  <input value={installProject} onChange={e => setInstallProject(e.target.value)}
                    placeholder={configs[0]?.path?.replace('.mcp.json', '').replace(/\/$/, '') || ''}
                    className="w-full rounded-lg border border-slate-800/50 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleInstall(showInstallForm)} disabled={installing === showInstallForm.name}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-400 disabled:opacity-40">
                    {installing === showInstallForm.name ? <Sparkles className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    安装
                  </button>
                  <button onClick={() => setShowInstallForm(null)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200">
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Marketplace results */}
          {marketLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Sparkles className="h-5 w-5 animate-spin mr-2" />搜索中...
            </div>
          ) : marketResults.length === 0 ? (
            marketSearched && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Store className="mb-3 h-10 w-10 text-slate-700" />
                <p>未找到匹配的 MCP 服务器</p>
                <p className="text-xs text-slate-600 mt-1">尝试其他搜索词</p>
              </div>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {marketResults.map((item) => (
                <div key={item.name} className="group rounded-xl border border-slate-800/50 bg-slate-900/40 p-4 backdrop-blur-sm transition-all hover:border-sky-500/30">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                      <PackageIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-slate-200 truncate">{item.name}</h3>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description || '暂无描述'}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-600">{item.publisher}</span>
                        <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500">{item.version}</span>
                        {item.keywords?.slice(0, 3).map(k => (
                          <span key={k} className="rounded bg-slate-800/30 px-1.5 py-0.5 text-[10px] text-slate-600">{k}</span>
                        ))}
                        {item.links?.homepage && (
                          <a href={item.links.homepage} target="_blank" rel="noopener noreferrer"
                            className="text-slate-600 hover:text-sky-400 transition-colors" onClick={e => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-800/30 pt-3">
                    <button onClick={() => { setShowInstallForm(item); setInstallName(''); setInstallProject('') }}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20">
                      <Download className="h-3 w-3" />安装
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
        /* ─── Configs (existing) ─── */
        <>
          {/* Custom path management */}
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <FolderPlus className="h-4 w-4 text-sky-400" />
                扫描路径
              </h2>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input value={newPathInput} onChange={e => setNewPathInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPath()}
                placeholder="输入项目绝对路径..."
                className="flex-1 rounded-lg border border-slate-800/50 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20" />
              <button onClick={handleAddPath}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-sky-400">
                <FolderPlus className="h-3.5 w-3.5" />添加
              </button>
            </div>
            {pathMsg && <p className="mb-2 text-xs text-emerald-400">{pathMsg}</p>}
            {customPaths.length > 0 && (
              <div className="space-y-1">
                {customPaths.map(p => (
                  <div key={p} className="group flex items-center justify-between rounded-lg bg-slate-800/20 px-3 py-2">
                    <span className="text-xs text-slate-400 font-mono truncate">{p}</span>
                    <button onClick={() => handleRemovePath(p)}
                      className="shrink-0 rounded p-1 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10px] text-slate-600">
              <code>~/.claude/projects/</code> 下项目自动扫描，<code>~/.claude/.mcp.json</code> 全局配置自动识别。此处添加额外的扫描路径。
            </p>
          </div>

          {/* JSON Editor */}
          {editingConfig && (
            <div className="rounded-xl border border-sky-500/30 bg-slate-900/50 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-300">
                  编辑 MCP 配置 · {editingConfig.project}
                </h2>
                <p className="text-xs text-slate-500">{editingConfig.path}</p>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 mb-3 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>修改 MCP 配置可能包含 API Key 等敏感信息。保存后需要重启 MCP 服务器才能生效。</span>
              </div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className={`w-full rounded-lg border bg-slate-950/60 p-4 font-mono text-xs leading-relaxed text-slate-300 focus:outline-none h-[400px] resize-none ${
                  editError ? 'border-red-500/50' : 'border-slate-800'
                }`}
                spellCheck={false}
              />
              {editError && (
                <p className="mt-2 text-xs text-red-400">{editError}</p>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={cancelEditConfig}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200">
                  <X className="h-3.5 w-3.5" />取消
                </button>
                <button onClick={handleSaveConfig} disabled={saving || !!editError}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-sky-400 disabled:opacity-40">
                  <Save className="h-3.5 w-3.5" />{saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}

          {configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Cpu className="mb-3 h-10 w-10 text-slate-700" />
              <p>未找到 MCP 配置</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((cfg) => {
                const servers = Object.entries(cfg.servers)
                const activeCount = servers.filter(([_, s]) => !s._disabled).length
                const isExpanded = expandedProject === `${cfg.source}-${cfg.project}`

                const sourceLabel: Record<string, { label: string; color: string }> = {
                  'claude-project': { label: 'Claude 项目', color: 'text-sky-400 bg-sky-500/10 ring-1 ring-sky-500/30' },
                  'claude-root': { label: '全局配置', color: 'text-purple-400 bg-purple-500/10 ring-1 ring-purple-500/30' },
                  workspace: { label: '工作区', color: 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/30' },
                  custom: { label: '自定义', color: 'text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/30' },
                }
                const src = (cfg.source && sourceLabel[cfg.source]) || sourceLabel.custom
                return (
                  <div key={`${cfg.source}-${cfg.project}`} className="overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
                    <button onClick={() => setExpandedProject(isExpanded ? null : `${cfg.source}-${cfg.project}`)}
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-slate-800/30">
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                      <FileJson className="h-4 w-4 text-sky-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">
                            {cfg.project === '__root__' ? '~/.claude/.mcp.json' : cfg.project}
                          </p>
                          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${src.color}`}>
                            {src.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">{cfg.path}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-slate-800/60 px-2 py-0.5 text-xs text-slate-400">
                        {activeCount}/{servers.length}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleHealthCheck(cfg) }} disabled={checkingHealth === cfg.project}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:opacity-40" title="健康检查">
                        {checkingHealth === cfg.project ? (
                          <Sparkles className="h-3.5 w-3.5 animate-spin text-slate-400" />
                        ) : (
                          <Activity className="h-3.5 w-3.5 text-slate-500 hover:text-emerald-400" />
                        )}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); startEditConfig(cfg) }}
                        className="shrink-0 rounded-lg bg-sky-500/12 px-3 py-2 text-sm font-medium text-sky-400 ring-1 ring-sky-500/40 transition-all hover:bg-sky-500/20 hover:shadow-sm hover:shadow-sky-500/10" title="编辑 JSON">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-800/50 px-4 pb-4">
                        <div className="space-y-2 mt-3">
                          {servers.map(([name, server]) => {
                            const serverKey = `${cfg.source}-${cfg.project}/${name}`
                            const isServerExpanded = expandedServer === serverKey
                            const isDisabled = server._disabled
                            return (
                              <div key={name} className={`overflow-hidden rounded-lg border transition-all ${
                                isDisabled
                                  ? 'border-slate-800/30 bg-slate-800/10 opacity-60'
                                  : 'border-slate-800/50 bg-slate-800/20 hover:border-slate-700/50'
                              }`}>
                                <button onClick={() => setExpandedServer(isServerExpanded ? null : serverKey)}
                                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-800/30">
                                  {isServerExpanded ? <ChevronDown className="h-3 w-3 shrink-0 text-slate-600" /> : <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />}
                                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${
                                    isDisabled ? 'bg-slate-700/30 text-slate-500' : 'bg-sky-500/10 text-sky-400'
                                  }`}>
                                    {server.type === 'streamableHttp' ? <Globe className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${isDisabled ? 'text-slate-500' : 'text-slate-200'}`}>
                                      {name}
                                      {healthStatus[cfg.path]?.[name] && (
                                        <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                                          healthStatus[cfg.path][name] === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'
                                        }`} />
                                      )}
                                    </p>
                                    {server.comment && (
                                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{server.comment}</p>
                                    )}
                                  </div>
                                  <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
                                    isDisabled ? 'text-slate-600 bg-slate-700/20' : 'text-emerald-400 bg-emerald-400/10'
                                  }`}>
                                    {isDisabled ? <><ToggleLeft className="h-3 w-3" /> 已禁用</> : <><ToggleRight className="h-3 w-3" /> 已启用</>}
                                  </span>
                                </button>

                                {isServerExpanded && (
                                  <div className="border-t border-slate-800/50 px-4 py-3 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-xs text-slate-400">{server.type || 'stdio'}</span>
                                      {isDisabled && server._disabled_reason && (
                                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">{server._disabled_reason}</span>
                                      )}
                                      {healthStatus[cfg.path]?.[name] && (
                                        <span className={`rounded-md px-2 py-0.5 text-xs ${
                                          healthStatus[cfg.path][name] === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                        }`}>
                                          {healthStatus[cfg.path][name] === 'healthy' ? '✓ 正常' : '✗ 异常'}
                                        </span>
                                      )}
                                      {healthStatus[cfg.path]?._error && (
                                        <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-400">连接失败</span>
                                      )}
                                    </div>

                                    {server.command && (
                                      <div>
                                        <p className="mb-1 text-xs font-medium text-slate-500">命令</p>
                                        <div className="rounded-lg bg-slate-950/60 px-3 py-2">
                                          <code className="text-sm text-slate-300">{server.command} {server.args?.join(' ') || ''}</code>
                                        </div>
                                      </div>
                                    )}

                                    {server.url && (
                                      <div>
                                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                                          <Globe className="h-3 w-3" />URL
                                        </p>
                                        <div className="rounded-lg bg-slate-950/60 px-3 py-2">
                                          <code className="text-sm text-sky-400">{server.url}</code>
                                        </div>
                                      </div>
                                    )}

                                    {server.env && Object.keys(server.env).length > 0 && (
                                      <div>
                                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                                          <Key className="h-3 w-3" />环境变量
                                        </p>
                                        <div className="space-y-1">
                                          {Object.entries(server.env).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-2 rounded-lg bg-slate-950/40 px-3 py-1.5">
                                              <span className="text-xs font-medium text-sky-400">{k}</span>
                                              <span className="text-xs text-slate-600">=</span>
                                              <span className="truncate text-xs text-slate-400 font-mono">
                                                {v.length > 40 ? v.slice(0, 40) + '...' : v}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
