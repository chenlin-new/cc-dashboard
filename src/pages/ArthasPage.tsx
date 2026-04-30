import { useState, useRef, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Bug, Download, Copy, Play, Check, Upload, ChevronRight, AlertTriangle, Clock, Zap, Terminal, FileText, Server, Wifi, WifiOff, Square, Trash2, Plus, Settings2, Edit3, X } from 'lucide-react'
import { connectArthas, executeArthasLive, generateArthasScript, analyzeArthasLog, fetchArthasServices, saveArthasService, deleteArthasService } from '../api'
import { useLocale } from '../contexts/LocaleContext'
import type { ArthasService, ArthasCommand, ArthasAnalyzeResult } from '../types'

const QUICK_COMMANDS: { type: string; label: string; icon: ReactNode; desc: string; method?: boolean; pkg?: boolean; arthasCmd?: (arg?: string) => string }[] = [
  { type: 'watch_error', label: 'Watch 异常', icon: <AlertTriangle className="h-3.5 w-3.5" />, desc: '捕获方法异常 + 入参', method: true, arthasCmd: (m) => `watch ${m} '{params, throwExp}' -x3 -e` },
  { type: 'watch_all', label: 'Watch 出入参', icon: <Terminal className="h-3.5 w-3.5" />, desc: '监控方法入参和返回值', method: true, arthasCmd: (m) => `watch ${m} '{params, returnObj}' -x3` },
  { type: 'trace', label: 'Trace 调用链', icon: <Zap className="h-3.5 w-3.5" />, desc: '追踪方法调用链路及耗时', method: true, arthasCmd: (m) => `trace ${m} -n 5` },
  { type: 'trace_slow', label: 'Trace 慢调用', icon: <Clock className="h-3.5 w-3.5" />, desc: '仅追踪 >50ms 的调用', method: true, arthasCmd: (m) => `trace ${m} '#cost > 50'` },
  { type: 'thread_top', label: '线程 Top 5', icon: <Server className="h-3.5 w-3.5" />, desc: 'CPU 占用最高线程', arthasCmd: () => 'thread -n 5' },
  { type: 'thread_deadlock', label: '死锁检测', icon: <AlertTriangle className="h-3.5 w-3.5" />, desc: '检测线程死锁', arthasCmd: () => 'thread -b' },
  { type: 'dashboard', label: 'Dashboard', icon: <Terminal className="h-3.5 w-3.5" />, desc: 'JVM 实时面板', arthasCmd: () => 'dashboard -i 3 -n 1' },
  { type: 'jvm_info', label: 'JVM 信息', icon: <Server className="h-3.5 w-3.5" />, desc: 'JVM 配置及参数', arthasCmd: () => 'jvm' },
  { type: 'logger_debug', label: '开 DEBUG 日志', icon: <FileText className="h-3.5 w-3.5" />, desc: '临时打开包级 DEBUG 日志', pkg: true, arthasCmd: (p) => `logger --name ${p || 'com.example'} --level DEBUG` },
]

const STORAGE_KEY = 'cc-arthas-ssh-config'
const EMPTY_SVC: ArthasService = { id: '', name: '', displayName: '', processName: '', defaultPackage: '', mainClass: '' }

export default function ArthasPage() {
  const { t } = useLocale()
  const [tab, setTab] = useState<'direct' | 'generator' | 'analyzer'>('direct')

  // ── Services ──
  const [services, setServices] = useState<ArthasService[]>([])
  const [svcManagerOpen, setSvcManagerOpen] = useState(false)
  const [editingSvc, setEditingSvc] = useState<ArthasService>(EMPTY_SVC)
  const refreshServices = useCallback(async () => {
    try { setServices(await fetchArthasServices()) } catch {}
  }, [])

  useEffect(() => { refreshServices() }, [refreshServices])

  // ── Direct Mode ──
  const [localMode, setLocalMode] = useState(() => localStorage.getItem(`${STORAGE_KEY}-local`) === 'true')
  const [sshHost, setSshHost] = useState(() => localStorage.getItem(`${STORAGE_KEY}-host`) || '')
  const [sshUser, setSshUser] = useState(() => localStorage.getItem(`${STORAGE_KEY}-user`) || '')
  const [sshPort, setSshPort] = useState(() => localStorage.getItem(`${STORAGE_KEY}-port`) || '22')
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [processes, setProcesses] = useState<{ pid: number; name: string }[]>([])
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const [liveMethod, setLiveMethod] = useState('')
  const [liveOutput, setLiveOutput] = useState<string[]>([])
  const [liveRunning, setLiveRunning] = useState(false)
  const [liveAbortCtrl, setLiveAbortCtrl] = useState<AbortController | null>(null)
  const [connectError, setConnectError] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)

  // ── Generator ──
  const [selectedSvcId, setSelectedSvcId] = useState('')
  const [selectedCmds, setSelectedCmds] = useState<Set<string>>(new Set(['watch_error', 'trace', 'thread_top']))
  const [genMethodInput, setGenMethodInput] = useState('')
  const [duration, setDuration] = useState('')
  const [script, setScript] = useState('')
  const [filename, setFilename] = useState('')
  const [scriptLoading, setScriptLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  // ── Analyzer ──
  const [logInput, setLogInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ArthasAnalyzeResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedSvc = services.find(s => s.id === selectedSvcId)

  // Auto-scroll output
  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight }, [liveOutput])

  // Default package when service selected
  const defaultPkg = selectedSvc?.defaultPackage || 'com.example'

  // ── Service CRUD ──
  const handleAddSvc = () => setEditingSvc({ ...EMPTY_SVC })
  const handleEditSvc = (s: ArthasService) => setEditingSvc({ ...s })
  const handleDeleteSvc = async (id: string) => {
    await deleteArthasService(id)
    if (selectedSvcId === id) setSelectedSvcId('')
    refreshServices()
  }
  const handleSaveSvc = async () => {
    if (!editingSvc.name.trim() || !editingSvc.processName.trim()) return
    await saveArthasService(editingSvc)
    setEditingSvc(EMPTY_SVC)
    refreshServices()
  }

  // ── Direct Mode ──
  const handleConnect = async () => {
    if (!localMode && (!sshHost.trim() || !sshUser.trim())) return
    localStorage.setItem(`${STORAGE_KEY}-local`, String(localMode))
    localStorage.setItem(`${STORAGE_KEY}-host`, sshHost.trim())
    localStorage.setItem(`${STORAGE_KEY}-user`, sshUser.trim())
    localStorage.setItem(`${STORAGE_KEY}-port`, sshPort)
    setConnecting(true); setConnectError('')
    try {
      const res = await connectArthas(sshHost.trim(), sshUser.trim(), parseInt(sshPort) || 22, localMode)
      setConnected(res.connected)
      if (res.connected) setProcesses(res.processes || [])
      else setConnectError(res.error || 'Connection failed')
    } catch (e: any) { setConnectError(e.message) }
    setConnecting(false)
  }

  const handleLiveExecute = async (cmdType: string) => {
    if (!selectedPid) return
    const preset = QUICK_COMMANDS.find(c => c.type === cmdType)
    if (!preset || !preset.arthasCmd) return
    let arg: string | undefined
    if (preset.method) arg = liveMethod.trim() || `${defaultPkg}.xxx.methodName`
    else if (preset.pkg) arg = defaultPkg
    const arthasCmd = preset.arthasCmd(arg)
    setLiveRunning(true)
    setLiveOutput(prev => [...prev, `\n▶ ${preset.label}: ${arthasCmd}`, '─'.repeat(60)])
    const ctrl = executeArthasLive(
      sshHost.trim(), sshUser.trim(), selectedPid, arthasCmd, parseInt(sshPort) || 22, localMode,
      (line) => setLiveOutput(prev => [...prev, line]),
      (code) => { setLiveOutput(prev => [...prev, `\n✅ Done (exit code: ${code})`]); setLiveRunning(false); setLiveAbortCtrl(null) },
      (err) => { setLiveOutput(prev => [...prev, `\n❌ Error: ${err}`]); setLiveRunning(false); setLiveAbortCtrl(null) },
    )
    setLiveAbortCtrl(ctrl)
  }

  const handleLiveStop = () => { liveAbortCtrl?.abort(); setLiveRunning(false); setLiveAbortCtrl(null); setLiveOutput(prev => [...prev, '\n⏹ Stopped']) }
  const handleDisconnect = () => { setConnected(false); setProcesses([]); setSelectedPid(null); setLiveOutput([]) }
  const clearOutput = () => setLiveOutput([])

  // ── Generator ──
  const toggleCmd = (type: string) => {
    const next = new Set(selectedCmds)
    next.has(type) ? next.delete(type) : next.add(type)
    setSelectedCmds(next)
  }

  const handleGenerate = async () => {
    setScriptLoading(true)
    try {
      const commands: ArthasCommand[] = []
      for (const type of selectedCmds) {
        const preset = QUICK_COMMANDS.find(c => c.type === type)
        if (!preset) continue
        const cmd: ArthasCommand = { type, label: preset.label }
        if (preset.method && genMethodInput.trim()) cmd.method = genMethodInput.trim()
        else if (preset.method && !genMethodInput.trim()) cmd.method = `${defaultPkg}.xxx.methodName`
        if (preset.pkg) cmd.pkg = defaultPkg
        commands.push(cmd)
      }
      const methods = genMethodInput.trim() ? genMethodInput.trim().split('\n').filter(Boolean).map(m => m.trim()) : []
      // Use managed service's processName or custom input
      const svcName = selectedSvc?.processName || (services.length > 0 ? services[0].processName : 'java-app')
      const res = await generateArthasScript({ serviceName: svcName, commands, methods, duration: duration ? parseInt(duration) : undefined })
      setScript(res.script); setFilename(res.filename)
    } catch (e: any) { setScript(`# Error: ${e.message}`); setFilename('') }
    setScriptLoading(false); setShowInstructions(false)
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { const ta = document.createElement('textarea'); ta.value = script; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/x-shellscript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename || 'arthas-debug.sh'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Analyzer ──
  const handleAnalyze = async () => {
    if (!logInput.trim()) return; setAnalyzing(true)
    try { setResult(await analyzeArthasLog(logInput)) }
    catch (e: any) { setResult({ sections: [], errors: [String(e.message)], warnings: [], traces: [], threads: [], summary: 'Analysis failed' }) }
    setAnalyzing(false)
  }

  const handleFileDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]) }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) readFile(e.target.files[0]) }
  const readFile = (file: File) => { const r = new FileReader(); r.onload = () => setLogInput(String(r.result || '')); r.readAsText(file) }

  const sectionIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'trace': return <Zap className="h-4 w-4 text-yellow-400" />
      case 'thread': return <Server className="h-4 w-4 text-blue-400" />
      case 'dashboard': return <Terminal className="h-4 w-4 text-green-400" />
      default: return <FileText className="h-4 w-4 text-slate-400" />
    }
  }

  const sectionLabel = (type: string) => {
    const key = `arthas.section${type.charAt(0).toUpperCase() + type.slice(1)}`
    return (t as any)(key) || type
  }

  // ── Service Manager Modal ──
  const ServiceManagerModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setSvcManagerOpen(false); setEditingSvc(EMPTY_SVC) }}>
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
          <h2 className="text-base font-semibold text-slate-100">管理诊断服务</h2>
          <button onClick={() => { setSvcManagerOpen(false); setEditingSvc(EMPTY_SVC) }} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
          {services.map(s => (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border border-slate-800/50 bg-slate-800/30 p-3.5 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{s.displayName || s.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-700/50 rounded px-1.5 py-0.5">{s.processName}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">{s.defaultPackage}</p>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEditSvc(s)} className="rounded p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-700/40 transition-all"><Edit3 className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDeleteSvc(s.id)} className="rounded p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          {services.length === 0 && <p className="text-sm text-slate-500 text-center py-8">还没有配置服务，点击下方按钮添加</p>}

          {/* Add / Edit Form */}
          {editingSvc.id !== undefined && (
            <div className="rounded-xl border border-[var(--cc-accent)]/30 bg-[var(--cc-accent)]/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300">{editingSvc.id ? '编辑服务' : '添加服务'}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-500">服务简名 *</label>
                  <input value={editingSvc.name} onChange={e => setEditingSvc({ ...editingSvc, name: e.target.value })}
                    placeholder="pms-service" className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">显示名</label>
                  <input value={editingSvc.displayName} onChange={e => setEditingSvc({ ...editingSvc, displayName: e.target.value })}
                    placeholder="PMS 主服务" className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">进程名 (jps 匹配) *</label>
                  <input value={editingSvc.processName} onChange={e => setEditingSvc({ ...editingSvc, processName: e.target.value })}
                    placeholder="fjskec-pms-service" className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">默认包名</label>
                  <input value={editingSvc.defaultPackage} onChange={e => setEditingSvc({ ...editingSvc, defaultPackage: e.target.value })}
                    placeholder="com.fjskec.pms" className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-600" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-500">主类名（可选，用于 jps 精确匹配）</label>
                  <input value={editingSvc.mainClass || ''} onChange={e => setEditingSvc({ ...editingSvc, mainClass: e.target.value })}
                    placeholder="com.fjskec.pms.PmsApplication" className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveSvc}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, var(--cc-accent), var(--cc-accent-secondary))` }}>
                  <Check className="h-3.5 w-3.5" />保存
                </button>
                <button onClick={() => setEditingSvc(EMPTY_SVC)}
                  className="rounded-lg border border-slate-700/60 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-all">取消</button>
              </div>
            </div>
          )}

          {!editingSvc.id && editingSvc.id !== '' && (
            <button onClick={handleAddSvc}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-slate-600/50 py-3 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all">
              <Plus className="h-3.5 w-3.5" />添加服务
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-[var(--cc-accent)]" />
            <h1 className="text-2xl font-bold text-slate-100">{t('arthas.title')}</h1>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">{t('arthas.desc')}</p>
        </div>
        <button
          onClick={() => setSvcManagerOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3.5 py-2 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-all"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {t('arthas.manageServices')}
          <span className="text-[10px] text-slate-500 bg-slate-700/50 rounded-full px-1.5 py-0.5">{services.length}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-800/40 p-1 w-fit">
        {(['direct', 'generator', 'analyzer'] as const).map(tabKey => {
          const icons = { direct: <Wifi className="h-4 w-4" />, generator: <Download className="h-4 w-4" />, analyzer: <Play className="h-4 w-4" /> }
          const labels = { direct: t('arthas.direct'), generator: t('arthas.scriptGen'), analyzer: t('arthas.logAnalyzer') }
          return (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${tab === tabKey ? 'bg-slate-700/70 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              {icons[tabKey]}{labels[tabKey]}
            </button>
          )
        })}
      </div>

      {/* ═══════════ DIRECT MODE ═══════════ */}
      {tab === 'direct' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-5">
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {connected ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-slate-500" />}
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('arthas.sshConfig')}</h3>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-[10px] text-slate-500">本地</span>
                  <button
                    onClick={() => { if (!connected) setLocalMode(!localMode) }}
                    className={`relative h-5 w-9 rounded-full transition-colors ${localMode ? 'bg-green-500/60' : 'bg-slate-600/60'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${localMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>
              <div className="space-y-2.5">
                {!localMode && (<>
                <div>
                  <label className="text-[11px] text-slate-500">{t('arthas.host')}</label>
                  <input value={sshHost} onChange={e => setSshHost(e.target.value)} placeholder="192.168.1.100" disabled={connected}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 disabled:opacity-40 placeholder-slate-500" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-500">{t('arthas.user')}</label>
                    <input value={sshUser} onChange={e => setSshUser(e.target.value)} placeholder="root" disabled={connected}
                      className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 disabled:opacity-40 placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">{t('arthas.port')}</label>
                    <input value={sshPort} onChange={e => setSshPort(e.target.value)} placeholder="22" disabled={connected}
                      className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 disabled:opacity-40 placeholder-slate-500" />
                  </div>
                </div>
                </>)}
                {connectError && <p className="text-xs text-red-400">{connectError}</p>}
                <div className="flex gap-2">
                {!connected ? (
                  <button onClick={handleConnect} disabled={connecting || (!localMode && (!sshHost.trim() || !sshUser.trim()))}
                    className="flex items-center gap-2 flex-1 justify-center rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: `linear-gradient(135deg, var(--cc-accent), var(--cc-accent-secondary))` }}>
                    {connecting ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('arthas.connecting')}</> : <><Wifi className="h-3.5 w-3.5" />{localMode ? '连接本地' : t('arthas.connect')}</>}
                  </button>
                ) : (
                  <button onClick={handleDisconnect}
                    className="flex items-center gap-2 flex-1 justify-center rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all">
                    <WifiOff className="h-3.5 w-3.5" />断开
                  </button>
                )}
                </div>
              </div>
            </div>

            {connected && (
              <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
                <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t('arthas.selectProcess')}</h3>
                {processes.length === 0 ? <p className="text-xs text-slate-500">No Java processes found</p> : (
                  <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
                    {processes.map(p => (
                      <button key={p.pid} onClick={() => setSelectedPid(p.pid)}
                        className={`flex items-center gap-2.5 w-full rounded-lg p-2 text-left text-xs transition-all font-mono ${selectedPid === p.pid ? 'bg-[var(--cc-accent)]/10 border border-[var(--cc-accent)]/30 text-slate-100' : 'bg-slate-800/30 border border-transparent text-slate-400 hover:border-slate-700/40'}`}>
                        <span className={`text-[10px] tabular-nums ${selectedPid === p.pid ? 'text-[var(--cc-accent)]' : 'text-slate-500'}`}>{p.pid}</span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {connected && selectedPid && (
              <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
                <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Quick Commands</h3>
                <div className="mb-3">
                  <input value={liveMethod} onChange={e => setLiveMethod(e.target.value)}
                    placeholder={`${defaultPkg}.xxx.methodName`}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-500" />
                </div>
                <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                  {QUICK_COMMANDS.map(cmd => (
                    <button key={cmd.type} onClick={() => handleLiveExecute(cmd.type)} disabled={liveRunning}
                      className="flex items-center gap-2 w-full rounded-lg p-2 text-left text-xs text-slate-300 hover:bg-slate-800/40 disabled:opacity-30 transition-all border border-transparent hover:border-slate-700/40">
                      <span className="text-slate-500">{cmd.icon}</span>
                      <span className="flex-1">{cmd.label}</span>
                      <span className="text-[10px] text-slate-600">{cmd.method ? '需方法名' : '即点即用'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!connected && (
              <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-900/20 p-5">
                <p className="text-xs text-slate-500">{t('arthas.directHint')}</p>
              </div>
            )}
          </div>

          <div className="xl:col-span-2">
            <div className="rounded-xl border border-slate-800/50 bg-slate-950/80 overflow-hidden h-full flex flex-col min-h-[600px]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-slate-900/40 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" /><span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" /><span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-[11px] text-slate-500">{t('arthas.liveOutput')}</span>
                  {selectedPid && <span className="text-[11px] text-slate-600">| PID: {selectedPid}</span>}
                </div>
                <div className="flex gap-1">
                  {liveRunning && <button onClick={handleLiveStop} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10"><Square className="h-3 w-3" />{t('arthas.stop')}</button>}
                  {liveOutput.length > 0 && <button onClick={clearOutput} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300"><Trash2 className="h-3 w-3" />清除</button>}
                </div>
              </div>
              <div ref={outputRef} className="flex-1 overflow-auto p-4">
                {liveOutput.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                      <Terminal className="h-10 w-10 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-600">{connected ? '选择一个 Java 进程，然后点击 Quick Command 执行' : '输入 SSH 信息并点击连接开始'}</p>
                    </div>
                  </div>
                ) : (
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">{liveOutput.join('\n')}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ GENERATOR TAB ═══════════ */}
      {tab === 'generator' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-5">
            {/* Service Selector */}
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
              <label className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                {t('arthas.serviceName')}
                <button onClick={() => setSvcManagerOpen(true)} className="text-[var(--cc-accent)] hover:underline text-[10px] normal-case tracking-normal">+ 管理</button>
              </label>
              {services.length === 0 ? (
                <p className="text-xs text-slate-500">尚未配置服务，请点击右上角「管理服务」添加</p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {services.map(s => (
                    <button key={s.id} onClick={() => { setSelectedSvcId(s.id); setGenMethodInput(s.defaultPackage ? `${s.defaultPackage}.xxx.methodName` : '') }}
                      className={`flex items-center gap-2.5 w-full rounded-lg p-2.5 text-left transition-all text-xs ${selectedSvcId === s.id ? 'bg-[var(--cc-accent)]/10 border border-[var(--cc-accent)]/30' : 'bg-slate-800/30 border border-transparent hover:border-slate-700/40'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-200">{s.displayName || s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{s.processName}</div>
                      </div>
                      {selectedSvcId === s.id && <div className="h-2 w-2 rounded-full bg-[var(--cc-accent)]" />}
                    </button>
                  ))}
                </div>
              )}
              {services.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/40">
                  <div className="text-[10px] text-slate-500">包前缀: <code className="text-slate-400 font-mono">{defaultPkg}</code></div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
              <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t('arthas.commands')}</label>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {QUICK_COMMANDS.map(cmd => (
                  <button key={cmd.type} onClick={() => toggleCmd(cmd.type)}
                    className={`flex items-start gap-2.5 w-full rounded-lg p-2.5 text-left transition-all ${selectedCmds.has(cmd.type) ? 'bg-[var(--cc-accent)]/10 border border-[var(--cc-accent)]/30' : 'bg-slate-800/30 border border-transparent hover:border-slate-700/40'}`}>
                    <span className={`mt-0.5 shrink-0 ${selectedCmds.has(cmd.type) ? 'text-[var(--cc-accent)]' : 'text-slate-500'}`}>{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium ${selectedCmds.has(cmd.type) ? 'text-slate-100' : 'text-slate-400'}`}>{cmd.label}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cmd.desc}</p>
                    </div>
                    <span className={`shrink-0 mt-0.5 rounded-full h-4 w-4 flex items-center justify-center text-[10px] ${selectedCmds.has(cmd.type) ? 'bg-[var(--cc-accent)]/20 text-[var(--cc-accent)]' : 'bg-slate-700/50 text-slate-600'}`}>
                      {selectedCmds.has(cmd.type) ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('arthas.customMethods')}</label>
              <textarea value={genMethodInput} onChange={e => setGenMethodInput(e.target.value)} placeholder={t('arthas.customMethodsHint')} rows={4}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-500 resize-none" />
            </div>

            <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('arthas.duration')}</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder={t('arthas.durationHint')} min={0} max={300}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[var(--cc-accent)]/50 placeholder-slate-500" />
            </div>

            <button onClick={handleGenerate} disabled={scriptLoading}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-40 transition-all"
              style={{ background: `linear-gradient(135deg, var(--cc-accent), var(--cc-accent-secondary))`, boxShadow: `0 4px 16px color-mix(in srgb, var(--cc-accent) 25%, transparent)` }}>
              {scriptLoading ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('arthas.generating')}</> : <><Download className="h-4 w-4" />{t('arthas.generate')}</>}
            </button>
          </div>

          <div className="xl:col-span-2 space-y-4">
            {script ? (<>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-400 font-mono">{filename}</span>
                  {selectedSvc && <span className="ml-3 text-[11px] text-slate-500">target: {selectedSvc.processName}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}{copied ? t('arthas.copied') : t('arthas.copyScript')}
                  </button>
                  <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors">
                    <Download className="h-3.5 w-3.5" />{t('arthas.download')}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800/50 bg-slate-950/80 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/50 bg-slate-900/40">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" /><span className="h-3 w-3 rounded-full bg-yellow-500/60" /><span className="h-3 w-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-[11px] text-slate-500">{t('arthas.scriptPreview')}</span>
                </div>
                <pre className="p-4 text-xs text-slate-300 font-mono overflow-auto max-h-[600px] leading-relaxed whitespace-pre">{script}</pre>
              </div>
            </>) : (
              <div className="flex items-center justify-center h-[500px] rounded-xl border border-dashed border-slate-700/50 bg-slate-900/20">
                <div className="text-center space-y-3 p-8">
                  <Terminal className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500">{t('arthas.scriptGen')} — 选择服务和命令后点击生成</p>
                </div>
              </div>
            )}
            {script && showInstructions && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-900/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-blue-300">{t('arthas.howToUse')}</h3>
                  <button onClick={() => setShowInstructions(false)} className="text-slate-500 hover:text-slate-300"><span className="text-xs">✕</span></button>
                </div>
                <ol className="space-y-1.5 text-xs text-slate-400">
                  {[t('arthas.step1'), t('arthas.step2'), t('arthas.step3'), t('arthas.step4'), t('arthas.step5')].map((step, i) => (
                    <li key={i} className="flex items-start gap-2"><ChevronRight className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ ANALYZER TAB ═══════════ */}
      {tab === 'analyzer' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className={`rounded-xl border-2 border-dashed p-4 transition-colors ${dragOver ? 'border-[var(--cc-accent)]/50 bg-[var(--cc-accent)]/5' : 'border-slate-700/50 bg-slate-900/20'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop}>
              <textarea value={logInput} onChange={e => setLogInput(e.target.value)} placeholder={t('arthas.pasteHint')} rows={20}
                className="w-full rounded-lg bg-transparent text-sm text-slate-100 font-mono focus:outline-none placeholder-slate-500 resize-none" />
              <div className="flex items-center justify-between mt-2">
                <div>
                  <input ref={fileRef} type="file" accept=".log,.txt,.out" onChange={handleFileSelect} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                    <Upload className="h-3 w-3" />{t('arthas.uploadFile')}
                  </button>
                </div>
                <button onClick={handleAnalyze} disabled={analyzing || !logInput.trim()}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: `linear-gradient(135deg, var(--cc-accent), var(--cc-accent-secondary))` }}>
                  {analyzing ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('arthas.analyzing')}</> : <><Play className="h-4 w-4" />{t('arthas.analyze')}</>}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {result ? (<>
              <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider"><Check className="h-3.5 w-3.5" />{t('arthas.resultSummary')}</h3>
                <p className={`text-sm font-semibold ${result.errors.length > 0 ? 'text-red-400' : result.summary.includes('Slow') ? 'text-yellow-400' : 'text-green-400'}`}>{result.summary}</p>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-900/10 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-red-400 mb-3 uppercase tracking-wider"><AlertTriangle className="h-3.5 w-3.5" />{t('arthas.errorsFound', { count: String(result.errors.length) })}</h3>
                  <ul className="space-y-1.5">{result.errors.map((err, i) => <li key={i} className="text-xs text-red-300 font-mono bg-red-900/20 rounded-lg p-2.5 break-all">{err}</li>)}</ul>
                </div>
              )}
              {result.sections.filter(s => s.content.trim()).map((section, i) => (
                <div key={i} className="rounded-xl border border-slate-800/50 bg-slate-900/40 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/50 bg-slate-800/30">
                    {sectionIcon(section.type)}
                    <span className="text-xs font-semibold text-slate-300">{section.label || sectionLabel(section.type)}</span>
                    {section.highlights.length > 0 && <span className="ml-auto text-[10px] text-yellow-400 bg-yellow-400/10 rounded-full px-2 py-0.5">{t('arthas.slowCalls', { count: String(section.highlights.length) })}</span>}
                  </div>
                  <pre className="p-4 text-xs text-slate-400 font-mono max-h-[300px] overflow-auto whitespace-pre-wrap break-all">{section.content.slice(0, 3000)}</pre>
                  {section.highlights.length > 0 && <div className="px-4 pb-3 space-y-1">{section.highlights.map((h, j) => <div key={j} className="text-xs text-yellow-400 font-mono">{h}</div>)}</div>}
                </div>
              ))}
              {result.sections.filter(s => s.content.trim()).length === 0 && result.errors.length === 0 && (
                <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-8 text-center"><Check className="h-8 w-8 text-green-400 mx-auto mb-2" /><p className="text-sm text-slate-400">{t('arthas.noErrors')}</p></div>
              )}
            </>) : (
              <div className="flex items-center justify-center h-[500px] rounded-xl border border-dashed border-slate-700/50 bg-slate-900/20">
                <div className="text-center space-y-3 p-8"><Play className="h-10 w-10 text-slate-600 mx-auto" /><p className="text-sm text-slate-500">{t('arthas.logAnalyzer')} — 粘贴 Arthas 输出日志</p></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service Manager Modal */}
      {svcManagerOpen && <ServiceManagerModal />}
    </div>
  )
}
