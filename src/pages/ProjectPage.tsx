import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  MessageSquare, Send, Sparkles, Trash2, User, Bot, StopCircle,
  PanelRightOpen, PanelRightClose, Copy, Check, Cpu, FolderGit2,
  Brain, ChevronRight,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendCcMessage, fetchMemories } from '../api'
import type { ChatMessage, MemoryItem } from '../types'
import MemoryCard from '../components/MemoryCard'

function decodeProjectName(encoded: string): string {
  const decoded = encoded.replace(/-/g, '/')
  if (navigator.platform?.startsWith('Win')) {
    return decoded.replace(/^(\w)\//, '$1:/')
  }
  return '/' + decoded.replace(/^-/, '')
}

export default function ProjectPage() {
  const { projectName } = useParams<{ projectName: string }>()
  const decoded = projectName ? decodeProjectName(projectName) : ''
  const displayName = decoded.split('/').filter(Boolean).pop() || decoded

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `你好！这是项目 **${displayName}** 的 Claude Code 对话。`, timestamp: Date.now() },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null)
  const [showMemory, setShowMemory] = useState(false)
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (showMemory) {
      fetchMemories().then(list => {
        setMemories(list.filter(m => m.project === projectName))
      }).catch(() => {})
    }
  }, [showMemory, projectName])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const placeholder: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg, placeholder])
    setSending(true)

    const ctrl = sendCcMessage(
      text, projectName || null,
      (token) => setMessages(prev => {
        const n = [...prev]
        const l = n[n.length - 1]
        if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + token }
        return n
      }),
      () => setSending(false),
      (err) => {
        setMessages(prev => {
          const n = [...prev]
          const l = n[n.length - 1]
          if (l.role === 'assistant') n[n.length - 1] = { ...l, content: l.content + (l.content ? '\n\n' : '') + '```\n错误: ' + err + '\n```' }
          return n
        })
        setSending(false)
      },
    )
    setAbortCtrl(ctrl)
  }, [input, sending, projectName])

  const handleStop = useCallback(() => {
    abortCtrl?.abort()
    setSending(false)
    setAbortCtrl(null)
  }, [abortCtrl])

  return (
    <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800/30 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <FolderGit2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-100 truncate">{displayName}</h2>
            <p className="text-xs text-slate-600 truncate">{decoded}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setShowMemory(!showMemory)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all ${showMemory ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
            >
              <Brain className="h-3.5 w-3.5" />
              {showMemory ? '隐藏记忆' : '项目记忆'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 p-1">
          {messages.map((msg, i) => {
            const streaming = sending && i === messages.length - 1 && msg.role === 'assistant'
            return (
              <div key={i} className={`group flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${msg.role === 'user' ? 'bg-sky-500/10' : 'bg-emerald-500/10'}`}>
                  {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-sky-400" /> : <Bot className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-sky-500/10 text-slate-200' : 'border border-slate-800/50 bg-slate-900/60 text-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-slate-600">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {msg.content && msg.role === 'assistant' && !streaming && (
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        className="rounded p-0.5 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-300 transition-all"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none">
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : streaming ? (
                        <span className="text-slate-500 italic">思考中...</span>
                      ) : (
                        <span className="text-slate-600 italic">空回复</span>
                      )}
                      {streaming && <span className="inline-block h-3 w-1.5 bg-emerald-400/70 animate-pulse ml-0.5 align-middle" />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-800/30 bg-slate-900/20 rounded-b-xl mt-3 px-3 py-2.5">
          <div className="flex items-end gap-1.5">
            <div className="flex items-center gap-0.5 rounded bg-slate-800/40 p-0.5 mr-1">
              <button className="rounded p-0.5 bg-slate-700/60 text-amber-400" title="Claude Code 原生">
                <Cpu className="h-3 w-3" />
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sending ? handleStop() : handleSend() } }}
              placeholder={sending ? '生成中...' : 'Enter发送 (Claude Code 原生模式)'}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
            />
            <button
              onClick={sending ? handleStop : handleSend}
              disabled={!sending && !input.trim()}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-40 ${sending ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}
            >
              {sending ? <StopCircle className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Memory sidebar */}
      {showMemory && (
        <div className="w-80 shrink-0 border-l border-slate-800/30 pl-4 overflow-y-auto">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-3">
            <Brain className="h-3.5 w-3.5 text-purple-400" />
            项目记忆 ({memories.length})
          </h3>
          {memories.length === 0 ? (
            <p className="text-xs text-slate-600">暂无项目记忆</p>
          ) : (
            <div className="space-y-2">
              {memories.map(m => (
                <MemoryCard key={`${m.project}-${m.filename}`} memory={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
