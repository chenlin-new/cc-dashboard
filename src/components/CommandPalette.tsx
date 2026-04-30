import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Command, LayoutDashboard, Brain, ListChecks, Wrench, Cpu, Puzzle, Radio,
  Settings2, Clock, Terminal, Plus, Search, X, MessageSquare,
} from 'lucide-react'
import { createTask, launchCc } from '../api'

interface CommandItem {
  id: string
  icon: any
  label: string
  desc: string
  action: () => void
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [cmdResult, setCmdResult] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQ(''); setSelectedIdx(0); setCmdResult('') }
  }, [open])

  const go = useCallback((path: string) => { onClose(); navigate(path) }, [navigate, onClose])

  const commands: CommandItem[] = [
    { id: 'nav-dash', icon: LayoutDashboard, label: '打开概览', desc: '前往 Dashboard', action: () => go('/') },
    { id: 'nav-memory', icon: Brain, label: '打开记忆', desc: '查看项目记忆', action: () => go('/memory') },
    { id: 'nav-tasks', icon: ListChecks, label: '打开任务', desc: '管理任务', action: () => go('/tasks') },
    { id: 'nav-agents', icon: Radio, label: '打开 Agent', desc: '追踪 Agent 活动', action: () => go('/agents') },
    { id: 'nav-skills', icon: Wrench, label: '打开技能', desc: '编辑技能', action: () => go('/skills') },
    { id: 'nav-mcp', icon: Cpu, label: '打开 MCP', desc: 'MCP 服务器配置', action: () => go('/mcp') },
    { id: 'nav-chat', icon: MessageSquare, label: '打开聊天', desc: '与 Claude 实时对话', action: () => go('/chat') },
    { id: 'nav-plugins', icon: Puzzle, label: '打开插件', desc: '查看已安装插件', action: () => go('/plugins') },
    { id: 'nav-sessions', icon: Clock, label: '打开会话', desc: '会话时间轴', action: () => go('/sessions') },
    { id: 'nav-settings', icon: Settings2, label: '打开配置', desc: '修改设置文件', action: () => go('/settings') },
    { id: 'launch-cc', icon: Terminal, label: '启动 Claude Code', desc: '在 Terminal 中打开 CC', action: () => launchCc().then(r => setCmdResult(r.launched ? '✓ CC 已启动' : '✗ 启动失败')).catch(e => setCmdResult('✗ 启动失败')) },
    { id: 'quick-task', icon: Plus, label: '快速创建任务', desc: '创建一个新任务', action: () => { go('/tasks'); setTimeout(() => document.querySelector<HTMLButtonElement>('[data-new-task]')?.click(), 100) } },
  ]

  const filtered = q.trim()
    ? commands.filter(c => c.label.includes(q) || c.desc.includes(q))
    : commands

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selectedIdx]) {
      filtered[selectedIdx].action()
      if (!filtered[selectedIdx].id.startsWith('launch') && !filtered[selectedIdx].id.startsWith('quick')) {
        onClose()
      }
    }
    if (e.key === 'Escape') { onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-black/50">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
            <Command className="h-5 w-5 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={handleKey}
              placeholder="输入命令..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <span className="text-xs text-slate-600">⌘P</span>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-600">无匹配命令</div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => { cmd.action(); if (!cmd.id.startsWith('launch') && !cmd.id.startsWith('quick')) onClose() }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                      i === selectedIdx ? 'bg-slate-800/60 ring-1 ring-slate-700/50' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800">
                      <cmd.icon className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{cmd.label}</p>
                      <p className="truncate text-xs text-slate-500">{cmd.desc}</p>
                    </div>
                    {cmdResult && i === selectedIdx && (
                      <span className="text-xs text-emerald-400">{cmdResult}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-600">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5">↑↓</kbd> 导航 <kbd className="rounded bg-slate-800 px-1.5 py-0.5 ml-2">↵</kbd> 执行 <kbd className="rounded bg-slate-800 px-1.5 py-0.5 ml-2">Esc</kbd> 关闭
          </div>
        </div>
      </div>
    </div>
  )
}
