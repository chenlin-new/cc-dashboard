import { useState, useEffect, useCallback } from 'react'
import {
  Wrench,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Hash,
  Edit3,
  Eye,
  Save,
  X,
  FileText,
  FolderOpen,
  Globe,
  FolderPlus,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchSkills, saveSkill } from '../api'
import type { SkillItem } from '../types'

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editFilename, setEditFilename] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [filter, setFilter] = useState<'all' | 'claude-global' | 'project' | 'custom'>('all')

  useEffect(() => {
    fetchSkills()
      .then(setSkills)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = useCallback((filename: string) => {
    if (editing === filename) return // don't collapse while editing
    setExpanded(expanded === filename ? null : filename)
  }, [expanded, editing])

  const startEdit = (skill: SkillItem) => {
    setEditing(skill.filename)
    setEditContent(skill.content)
    setEditFilename(skill.filename)
    setExpanded(skill.filename)
    setSaveMsg('')
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditContent('')
    setSaveMsg('')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await saveSkill(editFilename, editContent)
      setSaveMsg('success')
      setEditing(null)
      // Reload skills
      const updated = await fetchSkills()
      setSkills(updated)
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {
      setSaveMsg('error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = filter === 'all' ? skills : skills.filter(s => s.source === filter)
  const globalCount = skills.filter(s => s.source === 'claude-global').length
  const projectCount = skills.filter(s => s.source === 'project').length

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
      {/* Save notification */}
      {saveMsg === 'success' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 backdrop-blur-sm">
          技能文件已保存
        </div>
      )}
      {saveMsg === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
          保存失败，请重试
        </div>
      )}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Wrench className="h-6 w-6 text-purple-400" />
          技能
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {skills.length} 个技能（全局 {globalCount} · 项目 {projectCount}）
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/50 pb-3">
        {[
          { key: 'all', label: '全部', icon: Wrench },
          { key: 'claude-global', label: '全局技能', icon: Globe },
          { key: 'project', label: '项目技能', icon: FolderOpen },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key as any)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filter === key ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Wrench className="mb-3 h-10 w-10 text-slate-700" />
          <p>暂无技能</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((skill) => {
            const sourceLabel: Record<string, { label: string; color: string }> = {
              'claude-global': { label: '全局', color: 'text-purple-400 bg-purple-500/10 ring-1 ring-purple-500/30' },
              project: { label: skill.project || '项目', color: 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/30' },
              custom: { label: '自定义', color: 'text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/30' },
            }
            const src = (skill.source && sourceLabel[skill.source]) || sourceLabel.custom
            return (
            <div key={skill.filename} className={`overflow-hidden rounded-xl border backdrop-blur-sm transition-all ${
              editing === skill.filename
                ? 'border-purple-500/40 bg-slate-900/60 shadow-lg shadow-purple-500/5'
                : 'border-slate-800/50 bg-slate-900/30 hover:border-slate-700/50'
            }`}>
              {/* Header */}
              <div className="flex items-center gap-4 p-4">
                <button onClick={() => toggleExpand(skill.filename)} className="shrink-0">
                  {expanded === skill.filename
                    ? <ChevronDown className="h-4 w-4 text-slate-500" />
                    : <ChevronRight className="h-4 w-4 text-slate-500" />
                  }
                </button>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                  <Wrench className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200">{skill.name}</p>
                    {skill.source && (
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${src.color}`}>
                        {src.label}
                      </span>
                    )}
                  </div>
                  {skill.description && (
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{skill.description}</p>
                  )}
                </div>

                {skill.tags.length > 0 && (
                  <div className="hidden sm:flex flex-wrap gap-1">
                    {skill.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-0.5 rounded-md bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-500">
                        <Hash className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Edit / View toggle */}
                {editing === skill.filename ? (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 text-xs text-purple-400 ring-1 ring-purple-500/30">
                      <Edit3 className="h-3 w-3" />
                      编辑中
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(skill) }}
                    className="flex items-center gap-1 rounded-lg bg-purple-500/12 px-3 py-2 text-sm font-medium text-purple-400 ring-1 ring-purple-500/40 transition-all hover:bg-purple-500/20 hover:shadow-sm hover:shadow-purple-500/10"
                    title="编辑技能"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Expanded Content */}
              {expanded === skill.filename && (
                <div className="border-t border-slate-800/50">
                  {editing === skill.filename ? (
                    /* 👇 Typora-like Edit/Preview split view */
                    <div>
                      {/* Toolbar */}
                      <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900/60 px-4 py-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <FileText className="h-3 w-3" />
                          {skill.filename}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Edit3 className="h-3 w-3" />
                            编辑
                          </span>
                          <span className="text-slate-700">|</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Eye className="h-3 w-3" />
                            预览
                          </span>
                        </div>
                      </div>

                      {/* Split panes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
                        {/* Editor */}
                        <div className="p-0">
                          <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="h-[500px] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none"
                            spellCheck={false}
                          />
                        </div>
                        {/* Preview */}
                        <div className="p-4 overflow-y-auto max-h-[500px]">
                          <div className="markdown-body max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {editContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>

                      {/* Save bar */}
                      <div className="flex items-center justify-end gap-2 border-t border-slate-800/50 bg-slate-900/60 px-4 py-3">
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                          取消
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-purple-400 disabled:opacity-40"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only mode */
                    <div className="p-4">
                      <div className="markdown-body max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {skill.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
