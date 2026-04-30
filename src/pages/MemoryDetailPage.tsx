import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Brain, Sparkles, Edit3, Eye, Save, X, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchMemoryDetail, saveMemory } from '../api'
import { useLocale } from '../contexts/LocaleContext'

const typeLabels: Record<string, string> = {
  user: '用户',
  feedback: '反馈',
  project: '项目',
  reference: '参考',
}

const typeColors: Record<string, string> = {
  user: 'bg-purple-500/10 text-purple-400 ring-purple-500/30',
  feedback: 'bg-rose-500/10 text-rose-400 ring-rose-500/30',
  project: 'bg-sky-500/10 text-sky-400 ring-sky-500/30',
  reference: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
}

export default function MemoryDetailPage() {
  const { project, filename } = useParams<{ project: string; filename: string }>()
  const [data, setData] = useState<{ content: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const { t } = useLocale()

  useEffect(() => {
    if (!project || !filename) return
    fetchMemoryDetail(project, filename)
      .then(d => {
        setData(d)
        setEditContent(d.content)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [project, filename])

  const meta = (() => {
    if (!data?.content) return null
    const m = data.content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!m) return null
    const meta: Record<string, string> = {}
    for (const line of m[1].split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)/)
      if (match) meta[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
    return meta
  })()

  const body = data?.content?.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '') || ''

  const startEdit = () => {
    setEditContent(data?.content || '')
    setEditing(true)
    setSaveMsg('')
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditContent(data?.content || '')
    setSaveMsg('')
  }

  const handleSave = async () => {
    if (!project || !filename) return
    setSaving(true)
    try {
      await saveMemory(project, filename, editContent)
      setSaveMsg('success')
      setEditing(false)
      const updated = await fetchMemoryDetail(project, filename)
      setData(updated)
      setEditContent(updated.content)
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {
      setSaveMsg('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-500">
          <Sparkles className="h-5 w-5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Save notification */}
      {saveMsg === 'success' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 backdrop-blur-sm">
          {t('skills.saved')}
        </div>
      )}
      {saveMsg === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
          {t('skills.saveFailed')}
        </div>
      )}

      {/* Back */}
      <div className="flex items-center justify-between">
        <Link
          to="/memory"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
        <button
          onClick={editing ? cancelEdit : startEdit}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            editing
              ? 'text-slate-400 hover:bg-slate-800/40'
              : 'bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/40 hover:bg-sky-500/20 hover:shadow-sm hover:shadow-sky-500/10'
          }`}
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
          {editing ? t('common.cancel') : t('common.edit')}
        </button>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-100 truncate">
              {meta?.name || filename}
            </h1>
            {meta?.description && (
              <p className="mt-1 text-sm text-slate-400">{meta.description}</p>
            )}
            {meta && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={`rounded-md px-2 py-0.5 ring-1 ${typeColors[meta.type] || 'bg-slate-500/10 text-slate-400'}`}>
                  {typeLabels[meta.type] || meta.type}
                </span>
                <span className="text-slate-600">
                  {project} / {filename}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit / View Content */}
      {editing ? (
        <div className="overflow-hidden rounded-xl border border-sky-500/30 bg-slate-900/30 backdrop-blur-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900/60 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileText className="h-3 w-3" />
              {filename}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Edit3 className="h-3 w-3" />
              <span>{t('common.edit')}</span>
              <span className="text-slate-700">|</span>
              <Eye className="h-3 w-3" />
              <span>{t('common.preview')}</span>
            </div>
          </div>

          {/* Split panes */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="h-[500px] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 focus:outline-none"
              spellCheck={false}
            />
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
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-sky-400 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? t('skills.saving') : t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-6 backdrop-blur-sm">
          <div className="markdown-body max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {body}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
