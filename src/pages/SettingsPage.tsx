import { useState, useEffect } from 'react'
import { Settings2, Sparkles, Edit3, Save, X, AlertTriangle } from 'lucide-react'
import { fetchSettings, saveSettings } from '../api'
import type { Settings } from '../types'
import { useLocale } from '../contexts/LocaleContext'

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<'settings' | 'local' | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const { t } = useLocale()

  useEffect(() => {
    fetchSettings()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (type: 'settings' | 'local') => {
    const source = type === 'settings' ? data?.settings : data?.localSettings
    setEditText(JSON.stringify(source || {}, null, 2))
    setEditing(type)
    setEditError('')
    setSaveMsg('')
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditText('')
    setEditError('')
  }

  const handleSave = async () => {
    if (!editing) return
    setEditError('')
    try {
      const parsed = JSON.parse(editText)
      if (typeof parsed !== 'object' || parsed === null) {
        setEditError('JSON 必须是对象类型')
        return
      }
      setSaving(true)
      await saveSettings(editing, parsed)
      setSaveMsg('success')
      setEditing(null)
      const updated = await fetchSettings()
      setData(updated)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e: any) {
      setEditError(`JSON 解析错误: ${e.message}`)
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
          配置文件已保存，重新启动 Claude Code 后生效
        </div>
      )}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Settings2 className="h-6 w-6 text-slate-400" />
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('settings.desc')}
        </p>
      </div>

      {/* Warning notice */}
      {editing && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>修改配置文件会影响 Claude Code 的行为。错误的配置可能导致 CC 无法正常启动。建议先备份原内容。</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ConfigPanel
          title="settings.json"
          data={data?.settings}
          editing={editing === 'settings'}
          editText={editText}
          editError={editError}
          onEdit={() => startEdit('settings')}
          onCancel={cancelEdit}
          onSave={handleSave}
          onTextChange={setEditText}
          saving={saving}
          filepath="~/.claude/settings.json"
        />
        <ConfigPanel
          title="settings.local.json"
          data={data?.localSettings}
          editing={editing === 'local'}
          editText={editText}
          editError={editError}
          onEdit={() => startEdit('local')}
          onCancel={cancelEdit}
          onSave={handleSave}
          onTextChange={setEditText}
          saving={saving}
          filepath="~/.claude/settings.local.json"
        />
      </div>
    </div>
  )
}

function ConfigPanel({
  title, data, editing, editText, editError,
  onEdit, onCancel, onSave, onTextChange, saving, filepath,
}: {
  title: string
  data: any
  editing: boolean
  editText: string
  editError: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onTextChange: (v: string) => void
  saving: boolean
  filepath: string
}) {
  const { t } = useLocale()

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">{title}</h2>
          <p className="text-xs text-slate-600">{filepath}</p>
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500/12 px-4 py-2 text-sm font-medium text-sky-400 ring-1 ring-sky-500/40 transition-all hover:bg-sky-500/20 hover:shadow-sm hover:shadow-sky-500/10"
          >
            <Edit3 className="h-4 w-4" />
            {t('common.edit')}
          </button>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div className="px-5 pb-5">
          <textarea
            value={editText}
            onChange={e => onTextChange(e.target.value)}
            className={`w-full rounded-lg border bg-slate-950/60 p-4 font-mono text-xs leading-relaxed text-slate-300 focus:outline-none h-[400px] resize-none ${
              editError ? 'border-red-500/50' : 'border-slate-800'
            }`}
            spellCheck={false}
          />
          {editError && (
            <p className="mt-2 text-xs text-red-400">{editError}</p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800/40 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              {t('common.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={saving || !!editError}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-sky-400 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? t('skills.saving') : t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5">
          {data ? (
            <pre className="overflow-x-auto rounded-lg bg-slate-950/60 p-4 text-xs text-slate-300 max-h-[400px] overflow-y-auto">
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-slate-950/30 p-8 text-sm text-slate-600">
              文件不存在或无法读取
            </div>
          )}
        </div>
      )}
    </div>
  )
}
