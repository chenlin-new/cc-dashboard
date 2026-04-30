import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare, Terminal, Send, Sparkles, Trash2, User, Bot, StopCircle,
  Plus, X, Columns2, History, Clock, FileText, PanelRightOpen, PanelRightClose,
  Copy, Check, Pencil, Download, BookTemplate, Save, Star, Cpu,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendChatMessage, sendCcMessage, saveChatSession, fetchChatSessions, loadChatSession, deleteChatSession, patchChatSession } from '../api'
import type { ChatMessage, ChatTabState, ChatPaneState } from '../types'

let nextPaneId = 1
let nextTabId = 1

function freshPane(): ChatPaneState {
  return {
    id: `pane-${nextPaneId++}`,
    messages: [{ role: 'assistant', content: '你好！有什么可以帮助你的？', timestamp: Date.now() }],
    sending: false, streamingId: null, abortCtrl: null,
  }
}

function freshTab(): ChatTabState {
  return { id: `tab-${nextTabId++}`, title: `会话 ${nextTabId - 1}`, panes: [freshPane()], split: 1 }
}

interface PromptTemplate { id: string; title: string; content: string }
const TEMPLATES_KEY = 'cc-dashboard-templates'
function loadTemplates(): PromptTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]') } catch { return [] }
}
function saveTemplates(ts: PromptTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(ts))
}

/* ─── Single Chat Pane ─── */
function ChatPane({ pane, tabId, paneIndex, totalPanes, onUpdatePane, onSplitChange, onPaneMsgChange, templateTarget }: {
  pane: ChatPaneState; tabId: string; paneIndex: number; totalPanes: number
  onUpdatePane: (tabId: string, i: number, fn: (p: ChatPaneState) => ChatPaneState) => void
  onSplitChange: (tabId: string, split: 1 | 2 | 3) => void
  onPaneMsgChange?: () => void
  templateTarget?: string | null
}) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'chat' | 'terminal' | 'cc'>('chat')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [pane.messages])

  useEffect(() => {
    if (templateTarget) { setInput(templateTarget); inputRef.current?.focus() }
  }, [templateTarget])

  const upd = useCallback((fn: (p: ChatPaneState) => ChatPaneState) => onUpdatePane(tabId, paneIndex, fn), [tabId, paneIndex, onUpdatePane])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || pane.sending) return
    setInput('')
    const currentHistory = pane.messages

    // ── CC Native mode ──
    if (mode === 'cc') {
      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
      const placeholder: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
      upd(p => ({ ...p, messages: [...currentHistory, userMsg, placeholder], sending: true, streamingId: Date.now(), abortCtrl: null }))
      const ctrl = sendCcMessage(
        text, null,
        (token) => upd(p => { const n = [...p.messages]; const l = n[n.length - 1]; if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + token }; return { ...p, messages: n } }),
        () => { upd(p => ({ ...p, sending: false, streamingId: null, abortCtrl: null })); onPaneMsgChange?.() },
        (err) => upd(p => { const n = [...p.messages]; const l = n[n.length - 1]; if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + (l.content ? '\n\n' : '') + '```\n错误: ' + err + '\n```' }; return { ...p, messages: n, sending: false, streamingId: null, abortCtrl: null } }),
      )
      upd(p => ({ ...p, abortCtrl: ctrl }))
      return
    }

    // ── API mode ──
    if (editIdx !== null) {
      const beforeEdit = currentHistory.slice(0, editIdx)
      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
      upd(p => ({ ...p, messages: [...beforeEdit, userMsg], sending: false }))
      const historyForApi = beforeEdit.map(m => ({ role: m.role, content: m.content }))
      const placeholder: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
      upd(p => ({ ...p, messages: [...beforeEdit, userMsg, placeholder], sending: true, streamingId: Date.now(), abortCtrl: null }))
      const ctrl = sendChatMessage(
        text, historyForApi,
        (token) => upd(p => { const n = [...p.messages]; const l = n[n.length - 1]; if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + token }; return { ...p, messages: n } }),
        () => { setEditIdx(null); upd(p => ({ ...p, sending: false, streamingId: null, abortCtrl: null })); onPaneMsgChange?.() },
        (err) => upd(p => { const n = [...p.messages]; if (n.length > 0) { const l = n[n.length - 1]; if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + (l.content ? '\n\n' : '') + '```\n错误: ' + err + '\n```' } }; return { ...p, messages: n, sending: false, streamingId: null, abortCtrl: null } }),
      )
      upd(p => ({ ...p, abortCtrl: ctrl }))
      return
    }
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const placeholder: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
    upd(p => ({ ...p, messages: [...currentHistory, userMsg, placeholder], sending: true, streamingId: Date.now(), abortCtrl: null }))
    const ctrl = sendChatMessage(
      text, currentHistory.map(m => ({ role: m.role, content: m.content })),
      (token) => upd(p => { const n = [...p.messages]; const l = n[n.length - 1]; if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + token }; return { ...p, messages: n } }),
      () => { upd(p => ({ ...p, sending: false, streamingId: null, abortCtrl: null })); onPaneMsgChange?.() },
      (err) => upd(p => { const n = [...p.messages]; const l = n[n.length - 1]; if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + (l.content ? '\n\n' : '') + '```\n错误: ' + err + '\n```' }; return { ...p, messages: n, sending: false, streamingId: null, abortCtrl: null } }),
    )
    upd(p => ({ ...p, abortCtrl: ctrl }))
  }, [input, pane.sending, pane.messages, mode, upd, onPaneMsgChange, editIdx])

  const handleStop = useCallback(() => { pane.abortCtrl?.abort(); upd(p => ({ ...p, sending: false, streamingId: null, abortCtrl: null })) }, [pane.abortCtrl, upd])

  const handleEditMsg = useCallback((idx: number, text: string) => {
    setEditIdx(idx)
    setInput(text)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleCopy = useCallback(async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {}
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Pane header */}
      <div className="flex items-center justify-between border-b border-slate-800/30 bg-slate-900/20 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-mono">#{paneIndex + 1}</span>
          <div className="flex items-center gap-0.5 rounded bg-slate-800/40 p-0.5">
            <button onClick={() => setMode('chat')} className={`rounded p-0.5 transition-all ${mode === 'chat' ? 'bg-slate-700/60 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`} title="API 模式"><MessageSquare className="h-3 w-3" /></button>
            <button onClick={() => setMode('cc')} className={`rounded p-0.5 transition-all ${mode === 'cc' ? 'bg-slate-700/60 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`} title="Claude Code 原生"><Cpu className="h-3 w-3" /></button>
            <button onClick={() => setMode('terminal')} className={`rounded p-0.5 transition-all ${mode === 'terminal' ? 'bg-slate-700/60 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`} title="终端"><Terminal className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {totalPanes < 3 && (
            <button onClick={() => onSplitChange(tabId, (totalPanes + 1) as 1 | 2 | 3)} className="rounded p-0.5 text-slate-600 hover:text-slate-400" title="增加分屏">
              <Columns2 className="h-3 w-3" />
            </button>
          )}
          <button onClick={() => { pane.abortCtrl?.abort(); upd(p => ({ ...p, sending: false, streamingId: null, abortCtrl: null, messages: [{ role: 'assistant', content: '会话已清空', timestamp: Date.now() }] })) }}
            className="rounded p-0.5 text-slate-600 hover:text-red-400" title="清空"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${mode === 'chat' ? 'bg-slate-950/20 p-3 space-y-3' : 'bg-black/50 p-3 space-y-0'}`}>
        {pane.messages.map((msg, i) => {
          const streaming = pane.sending && i === pane.messages.length - 1 && msg.role === 'assistant'
          const isEditing = editIdx === i
          return mode === 'chat' ? (
            <div key={i} className={`group flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${isEditing ? 'opacity-60' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${msg.role === 'user' ? 'bg-sky-500/10' : 'bg-emerald-500/10'}`}>
                {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-sky-400" /> : <Bot className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-sky-500/10 text-slate-200' : 'border border-slate-800/50 bg-slate-900/60 text-slate-200'}`}>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] text-slate-600">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.role === 'user' && !streaming && (
                      <button onClick={() => handleEditMsg(i, msg.content)} className="rounded p-0.5 text-slate-600 hover:text-sky-400" title="编辑">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {msg.content && (
                      <button onClick={() => handleCopy(i, msg.content)} className="rounded p-0.5 text-slate-600 hover:text-slate-300" title="复制">
                        {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                {msg.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{msg.content}</p> : (
                  <div className="prose prose-invert prose-xs max-w-none">
                    {msg.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : streaming ? <span className="text-slate-500 italic">思考中...</span> : <span className="text-slate-600 italic">空回复</span>}
                    {streaming && <span className="inline-block h-3 w-1.5 bg-emerald-400/70 animate-pulse ml-0.5 align-middle" />}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="group font-mono text-xs leading-relaxed">
              {msg.role === 'user' ? (
                <div className="flex items-start gap-1">
                  <span className="text-emerald-400 shrink-0">$ </span>
                  <span className={`text-slate-200 ${isEditing ? 'italic text-slate-500' : ''}`}>{isEditing ? '编辑中...' : msg.content}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!streaming && (
                      <button onClick={() => handleEditMsg(i, msg.content)} className="text-slate-600 hover:text-sky-400"><Pencil className="h-2.5 w-2.5" /></button>
                    )}
                    {msg.content && (
                      <button onClick={() => handleCopy(i, msg.content)} className="text-slate-600 hover:text-slate-300">{copiedIdx === i ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1">
                  <span className="text-slate-600 shrink-0 mr-0.5">│</span>
                  <span className="text-emerald-300/90 whitespace-pre-wrap">{msg.content || (streaming ? '_' : '')}</span>
                  {streaming && msg.content && <span className="inline-block h-3 w-1.5 bg-emerald-400/70 animate-pulse ml-0.5 align-middle" />}
                </div>
              )}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/30 bg-slate-900/20 px-3 py-2">
        <div className="flex items-end gap-1.5 relative">
          {editIdx !== null && (
            <div className="absolute bottom-full left-0 mb-1 ml-1 flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400 ring-1 ring-sky-500/30">
              <Pencil className="h-2.5 w-2.5" />编辑消息
              <button onClick={() => { setEditIdx(null); setInput('') }} className="ml-1 hover:text-sky-300"><X className="h-2.5 w-2.5" /></button>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pane.sending ? handleStop() : handleSend() } }}
            placeholder={pane.sending ? '生成中...' : 'Enter发送'}
            rows={1}
            className={`flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 ${mode === 'terminal' ? 'font-mono' : ''}`}
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
          />
          <button onClick={pane.sending ? handleStop : handleSend}
            disabled={!pane.sending && !input.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-40 ${pane.sending ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>
            {pane.sending ? <StopCircle className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function ChatPage() {
  const [tabs, setTabs] = useState<ChatTabState[]>([freshTab()])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [savedSessions, setSavedSessions] = useState<any[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [sessionDirty, setSessionDirty] = useState(0)
  const sessionIdRef = useRef<string | null>(null)
  const [templates, setTemplates] = useState<PromptTemplate[]>(loadTemplates)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateEditId, setTemplateEditId] = useState<string | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateTarget, setTemplateTarget] = useState<string | null>(null)
  const [favoriteFilter, setFavoriteFilter] = useState(false)
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  const activeIdx = tabs.findIndex(t => t.id === activeTabId)

  // Load saved sessions on mount
  useEffect(() => {
    fetchChatSessions().then(setSavedSessions).catch(() => {})
  }, [])

  // Auto-save with debounce
  useEffect(() => {
    if (sessionDirty === 0) return
    const timer = setTimeout(async () => {
      const allMsgs = tabs.flatMap(t => t.panes.flatMap(p => p.messages))
      if (allMsgs.length === 0) return
      const firstUser = allMsgs.find(m => m.role === 'user')
      const title = firstUser?.content?.slice(0, 60) || '无标题'
      const data = {
        id: sessionIdRef.current || undefined,
        title,
        tabs: tabs.length,
        messages: tabs.map(t => ({ title: t.title, split: t.split, panes: t.panes.map(p => ({ messages: p.messages })) })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      try {
        const res = await saveChatSession(data)
        sessionIdRef.current = res.id
        setSavedSessions(prev => {
          const existing = prev.find(s => s.id === res.id)
          if (existing) return prev.map(s => s.id === res.id ? { ...s, title, messageCount: allMsgs.length, tabCount: tabs.length, updatedAt: Date.now() } : s)
          return [{ id: res.id, title, messageCount: allMsgs.length, tabCount: tabs.length, updatedAt: Date.now(), createdAt: Date.now() }, ...prev]
        })
      } catch {}
    }, 2000)
    return () => clearTimeout(timer)
  }, [sessionDirty, tabs])

  // Mark session dirty on tab/msg changes
  useEffect(() => { setSessionDirty(d => d + 1) }, [tabs])

  const updateTab = useCallback((tabId: string, fn: (t: ChatTabState) => ChatTabState) => {
    setTabs(prev => prev.map(t => t.id === tabId ? fn(t) : t))
  }, [])

  const updatePane = useCallback((tabId: string, paneIndex: number, fn: (p: ChatPaneState) => ChatPaneState) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const panes = [...t.panes]
      panes[paneIndex] = fn({ ...panes[paneIndex] })
      return { ...t, panes }
    }))
  }, [])

  const handlePaneMsgChange = useCallback(() => {
    setSessionDirty(d => d + 1)
  }, [])

  const addTab = () => { const t = freshTab(); setTabs(prev => [...prev, t]); setActiveTabId(t.id) }

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId)
      return next.length === 0 ? [freshTab()] : next
    })
    setActiveTabId(prev => prev === tabId ? tabs[Math.max(0, tabs.findIndex(t => t.id === tabId) - 1)]?.id || tabs[0]?.id : prev)
  }

  const renameTab = (tabId: string, title: string) => updateTab(tabId, t => ({ ...t, title }))

  const handleSplitChange = useCallback((tabId: string, split: 1 | 2 | 3) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const cur = t.panes.length
      if (split > cur) return { ...t, split, panes: [...t.panes, ...Array.from({ length: split - cur }, () => freshPane())] }
      if (split < cur) return { ...t, split, panes: t.panes.slice(0, split) }
      return { ...t, split }
    }))
  }, [])

  // Load a saved session
  const loadSession = async (id: string) => {
    try {
      const data = await loadChatSession(id)
      sessionIdRef.current = id
      if (data.tabs && data.messages) {
        nextTabId = data.tabs + 1
        nextPaneId = data.messages.reduce((acc: number, t: any) => Math.max(acc, (t.panes?.length || 0) + 1), 1)
        const restored = data.messages.map((t: any, i: number) => ({
          id: `tab-${i}`,
          title: t.title || `会话 ${i + 1}`,
          split: t.split || 1,
          panes: (t.panes || [{ messages: t.messages || [] }]).map((p: any) => ({
            id: `pane-${nextPaneId++}`,
            messages: p.messages || [],
            sending: false, streamingId: null, abortCtrl: null,
          })),
        }))
        setTabs(restored)
        setActiveTabId(restored[0]?.id || '')
      }
    } catch {}
  }

  const handleExport = useCallback(() => {
    const lines: string[] = ['# Claude Code 对话导出', '', `导出时间: ${new Date().toLocaleString('zh-CN')}`, '']
    tabs.forEach((tab, ti) => {
      lines.push(`## ${tab.title}`, '')
      tab.panes.forEach((pane, pi) => {
        if (tab.panes.length > 1) lines.push(`### 面板 ${pi + 1}`, '')
        pane.messages.forEach(msg => {
          const role = msg.role === 'user' ? '👤 User' : '🤖 Claude'
          const time = msg.timestamp ? ` *(${new Date(msg.timestamp).toLocaleString('zh-CN')})*` : ''
          lines.push(`**${role}**${time}`, '', msg.content, '', '---', '')
        })
      })
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [tabs])

  const deleteSession = async (id: string) => {
    try {
      await deleteChatSession(id)
      setSavedSessions(prev => prev.filter(s => s.id !== id))
      if (sessionIdRef.current === id) sessionIdRef.current = null
    } catch {}
  }

  // ─── Templates ───
  const handleAddTemplate = () => {
    if (!templateTitle.trim() || !templateBody.trim()) return
    const next = [...templates, { id: Date.now().toString(36), title: templateTitle.trim(), content: templateBody }]
    setTemplates(next)
    saveTemplates(next)
    setTemplateTitle('')
    setTemplateBody('')
  }

  const handleSaveEditTemplate = () => {
    if (!templateEditId || !templateTitle.trim() || !templateBody.trim()) return
    const next = templates.map(t => t.id === templateEditId ? { ...t, title: templateTitle.trim(), content: templateBody } : t)
    setTemplates(next)
    saveTemplates(next)
    setTemplateEditId(null)
    setTemplateTitle('')
    setTemplateBody('')
  }

  const handleEditTemplate = (t: PromptTemplate) => {
    setTemplateEditId(t.id)
    setTemplateTitle(t.title)
    setTemplateBody(t.content)
  }

  const handleDeleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id)
    setTemplates(next)
    saveTemplates(next)
    if (templateEditId === id) { setTemplateEditId(null); setTemplateTitle(''); setTemplateBody('') }
  }

  const toggleFavorite = async (id: string) => {
    const session = savedSessions.find(s => s.id === id)
    if (!session) return
    const next = !session.favorite
    setSavedSessions(prev => prev.map(s => s.id === id ? { ...s, favorite: next } : s))
    try { await patchChatSession(id, { favorite: next }) } catch {}
  }

  const handleSaveTags = async (id: string) => {
    const tags = tagInput.split(/[,，\s]+/).filter(Boolean)
    setSavedSessions(prev => prev.map(s => s.id === id ? { ...s, tags } : s))
    try { await patchChatSession(id, { tags }) } catch {}
    setEditingTags(null)
    setTagInput('')
  }

  const handleUseTemplate = (content: string) => {
    setTemplateTarget(content)
    setShowTemplates(false)
  }

  const paneGridClass = activeTab.split === 1 ? 'grid-cols-1' : activeTab.split === 2 ? 'grid-cols-2' : 'grid-cols-2'

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center rounded-t-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
          <div className="flex-1 flex items-center overflow-x-auto">
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId
              return (
                <div key={tab.id}
                  className={`group relative flex items-center gap-2 px-4 py-2.5 text-xs transition-all cursor-pointer select-none border-r border-slate-800/50 min-w-0 ${isActive ? 'bg-slate-800/40 text-slate-200' : 'text-slate-500 hover:bg-slate-800/20 hover:text-slate-300'}`}
                  onClick={() => setActiveTabId(tab.id)}>
                  <input value={tab.title} onChange={e => renameTab(tab.id, e.target.value)} onClick={e => e.stopPropagation()}
                    className={`w-16 bg-transparent text-xs font-medium focus:outline-none focus:text-slate-100 ${isActive ? 'text-slate-200' : 'text-slate-500'}`} />
                  <span className="text-[10px] text-slate-600">{tab.panes.length}p</span>
                  {tabs.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); closeTab(tab.id) }} className="rounded p-0.5 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400"><X className="h-3 w-3" /></button>
                  )}
                </div>
              )
            })}
            <button onClick={addTab} className="flex items-center gap-1 px-3 py-2.5 text-xs text-slate-500 hover:text-slate-300"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center gap-1 px-2 border-l border-slate-800/50">
            <button onClick={() => setShowTemplates(!showTemplates)}
              className={`rounded-lg p-1.5 transition-all ${showTemplates ? 'bg-purple-500/10 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="提示词模板">
              <BookTemplate className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleExport}
              className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 transition-all"
              title="导出对话">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowSessions(!showSessions)}
              className={`rounded-lg p-1.5 transition-all ${showSessions ? 'bg-sky-500/10 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="历史会话">
              {showSessions ? <PanelRightClose className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Panes */}
        <div className={`flex-1 grid ${paneGridClass} gap-0 border-x border-slate-800/50 bg-slate-950/10 overflow-hidden`}
          style={activeTab.split === 3 ? { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' } : {}}>
          {activeTab.panes.map((pane, i) => (
            <div key={pane.id} className="border-r border-b border-slate-800/30 overflow-hidden flex flex-col"
              style={activeTab.split === 3 && i === 0 ? { gridRow: 'span 2' } : {}}>
              <ChatPane pane={pane} tabId={activeTab.id} paneIndex={i} totalPanes={activeTab.panes.length}
                onUpdatePane={updatePane} onSplitChange={handleSplitChange} onPaneMsgChange={handlePaneMsgChange}
                templateTarget={i === 0 ? templateTarget : null} />
            </div>
          ))}
        </div>
      </div>

      {/* Templates sidebar */}
      {showTemplates && (
        <div className="w-72 shrink-0 border-l border-slate-800/50 bg-slate-900/30 backdrop-blur-sm overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <BookTemplate className="h-3.5 w-3.5" />
              提示词模板
            </h3>
            <button
              onClick={() => { setTemplateEditId('new'); setTemplateTitle(''); setTemplateBody('') }}
              className="rounded p-0.5 text-slate-500 hover:text-slate-300">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add / Edit form */}
          {(templateEditId === 'new' || templateEditId) && (
            <div className="p-3 border-b border-slate-800/50 space-y-2">
              <input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)}
                placeholder="模板名称"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-purple-500/50 focus:outline-none" />
              <textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)}
                placeholder="提示词内容..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-purple-500/50 focus:outline-none" />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={templateEditId === 'new' ? handleAddTemplate : handleSaveEditTemplate}
                  className="flex items-center gap-1 rounded-lg bg-purple-500 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-purple-400">
                  <Save className="h-3 w-3" />
                  {templateEditId === 'new' ? '创建' : '保存'}
                </button>
                <button
                  onClick={() => { setTemplateEditId(null); setTemplateTitle(''); setTemplateBody('') }}
                  className="rounded-lg px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200">
                  取消
                </button>
              </div>
            </div>
          )}

          {templates.length === 0 && !templateEditId ? (
            <div className="px-4 py-8 text-center text-xs text-slate-600">暂无模板，点击 + 创建</div>
          ) : (
            <div className="p-2 space-y-1 flex-1 overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} className="group rounded-lg px-3 py-2.5 text-xs transition-all hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => handleUseTemplate(t.content)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-slate-200 font-medium">{t.title}</p>
                      <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">{t.content}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                      <button onClick={e => { e.stopPropagation(); handleEditTemplate(t) }}
                        className="rounded p-0.5 text-slate-600 hover:text-purple-400"><Pencil className="h-3 w-3" /></button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                        className="rounded p-0.5 text-slate-600 hover:text-red-400"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved sessions sidebar */}
      {showSessions && (
        <div className="w-72 shrink-0 border-l border-slate-800/50 bg-slate-900/30 backdrop-blur-sm overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800/50">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <History className="h-3.5 w-3.5" />
                历史会话
                {savedSessions.length > 0 && <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500">{savedSessions.length}</span>}
              </h3>
              <button onClick={() => setFavoriteFilter(!favoriteFilter)}
                className={`rounded p-1 transition-all ${favoriteFilter ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                title="收藏过滤">
                <Star className="h-3.5 w-3.5" fill={favoriteFilter ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          {savedSessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-600">暂无保存的会话</div>
          ) : (
            <div className="p-2 space-y-1 flex-1 overflow-y-auto">
              {savedSessions.filter(s => !favoriteFilter || s.favorite).map(s => (
                <div key={s.id} className="group rounded-lg px-3 py-2.5 text-xs transition-all hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => loadSession(s.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => { e.stopPropagation(); toggleFavorite(s.id) }}
                          className={`shrink-0 ${s.favorite ? 'text-amber-400' : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}>
                          <Star className="h-3 w-3" fill={s.favorite ? 'currentColor' : 'none'} />
                        </button>
                        <p className="truncate text-slate-200 font-medium">{s.title}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{new Date(s.updatedAt || s.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <FileText className="h-2.5 w-2.5 ml-1" />
                        <span>{s.messageCount}条</span>
                        {s.tabCount > 1 && <span>{s.tabCount}tab</span>}
                      </div>
                      {/* Tags */}
                      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                        {(s.tags || []).map((tag: string) => (
                          <span key={tag} className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[9px] text-slate-500">{tag}</span>
                        ))}
                        {editingTags === s.id ? (
                          <div className="flex items-center gap-1 w-full mt-1" onClick={e => e.stopPropagation()}>
                            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveTags(s.id) }}
                              placeholder={(s.tags || []).join(', ')}
                              autoFocus
                              className="flex-1 rounded border border-slate-700 bg-slate-950/50 px-1.5 py-0.5 text-[9px] text-slate-200 focus:border-purple-500/50 focus:outline-none" />
                            <button onClick={() => handleSaveTags(s.id)}
                              className="rounded p-0.5 text-slate-500 hover:text-purple-400"><Save className="h-2.5 w-2.5" /></button>
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setEditingTags(s.id); setTagInput((s.tags || []).join(', ')) }}
                            className="rounded px-1 py-0.5 text-[9px] text-slate-600 hover:text-slate-400 hover:bg-slate-800/40">
                            +标签
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                      className="shrink-0 rounded p-1 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
