import type { MemoryItem, TaskItem, TaskDetail, SkillItem, Settings, Stats, McpConfig, PluginInfo, AgentInfo, MarketplaceItem } from './types'

const BASE = '/api'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// ── Stats ──
export function fetchStats(): Promise<Stats> {
  return fetchJson(`${BASE}/stats`)
}

// ── Memory ──
export function fetchMemories(): Promise<MemoryItem[]> {
  return fetchJson(`${BASE}/memory`)
}

export function fetchMemoryDetail(project: string, filename: string): Promise<{ project: string; filename: string; content: string }> {
  return fetchJson(`${BASE}/memory/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`)
}

// ── Tasks ──
export function fetchTasks(): Promise<TaskItem[]> {
  return fetchJson(`${BASE}/tasks`)
}

export function fetchTaskDetail(id: string): Promise<TaskDetail> {
  return fetchJson(`${BASE}/tasks/${encodeURIComponent(id)}`)
}

export function createTask(data: { subject: string; description?: string; status?: string; scheduledAt?: string | null }): Promise<TaskItem> {
  return fetchJson(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateTaskStatus(id: string, status: string): Promise<any> {
  return fetchJson(`${BASE}/tasks/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export function deleteTask(id: string): Promise<any> {
  return fetch(`${BASE}/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(r => r.json())
}

export function executeTask(id: string): Promise<{ launched: boolean; error?: string }> {
  return fetchJson(`${BASE}/tasks/${encodeURIComponent(id)}/execute`, { method: 'POST' })
}

// ── Skills ──
export function fetchSkills(): Promise<SkillItem[]> {
  return fetchJson(`${BASE}/skills`)
}

export function saveSkill(filename: string, content: string): Promise<any> {
  return fetchJson(`${BASE}/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content }),
  })
}

// ── MCP ──
export function fetchMcpConfigs(): Promise<McpConfig[]> {
  return fetchJson(`${BASE}/mcp`)
}

// ── Plugins ──
export function fetchPlugins(): Promise<PluginInfo> {
  return fetchJson(`${BASE}/plugins`)
}

// ── Agents ──
export function fetchAgents(): Promise<AgentInfo[]> {
  return fetchJson(`${BASE}/agents`)
}

export function subscribeAgentEvents(
  onEvent: (event: string, data: any) => void
): () => void {
  const es = new EventSource(`${BASE}/agents/stream`)
  es.addEventListener('agent_created', (e) => onEvent('agent_created', JSON.parse(e.data)))
  es.addEventListener('agent_updated', (e) => onEvent('agent_updated', JSON.parse(e.data)))
  es.addEventListener('agent_removed', (e) => onEvent('agent_removed', JSON.parse(e.data)))
  es.addEventListener('task_created', (e) => onEvent('task_created', JSON.parse(e.data)))
  es.addEventListener('task_updated', (e) => onEvent('task_updated', JSON.parse(e.data)))
  es.addEventListener('task_deleted', (e) => onEvent('task_deleted', JSON.parse(e.data)))
  es.onerror = () => {}
  return () => es.close()
}

// ── Settings ──
export function fetchSettings(): Promise<Settings> {
  return fetchJson(`${BASE}/settings`)
}

export { fetchJson }

// ── Save / Edit APIs ──

export function saveMemory(project: string, filename: string, content: string): Promise<any> {
  return fetchJson(`${BASE}/memory/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export function saveMcpConfig(path: string, mcpServers: Record<string, any>): Promise<any> {
  return fetchJson(`${BASE}/mcp`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, mcpServers }),
  })
}

export function saveSettings(type: 'settings' | 'local', content: any): Promise<any> {
  return fetchJson(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content }),
  })
}

// ── Search ──
export function searchAll(q: string): Promise<{ query: string; results: { type: string; title: string; desc: string; link: string }[] }> {
  return fetchJson(`${BASE}/search?q=${encodeURIComponent(q)}`)
}

// ── Sessions ──
export function fetchSessions(): Promise<{ id: string; project: string; size: number; mtime: number; firstMsg: string }[]> {
  return fetchJson(`${BASE}/sessions`)
}

// ── MCP Marketplace ──
export function searchMcpMarketplace(q: string): Promise<{ query: string; results: MarketplaceItem[] }> {
  return fetchJson(`${BASE}/mcp/marketplace?q=${encodeURIComponent(q)}`)
}

export function installMcpServer(name: string, packageName: string, projectPath?: string): Promise<{ installed: boolean; path: string; name: string; packageName: string }> {
  return fetchJson(`${BASE}/mcp/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, packageName, projectPath }),
  })
}

// ── MCP Custom Paths ──
export function fetchMcpCustomPaths(): Promise<{ paths: string[] }> {
  return fetchJson(`${BASE}/mcp/paths`)
}

export function addMcpCustomPath(path: string): Promise<{ paths: string[] }> {
  return fetchJson(`${BASE}/mcp/paths`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function removeMcpCustomPath(path: string): Promise<{ paths: string[] }> {
  return fetchJson(`${BASE}/mcp/paths`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remove: path }),
  })
}

// ── Plugin Marketplace ──
export function searchPluginMarketplace(q: string): Promise<{ query: string; results: MarketplaceItem[] }> {
  return fetchJson(`${BASE}/plugins/marketplace?q=${encodeURIComponent(q)}`)
}

export function installPlugin(packageName: string, scope?: string): Promise<{ installed: boolean; packageName: string; scope: string }> {
  return fetchJson(`${BASE}/plugins/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageName, scope }),
  })
}

// ── MCP Health ──
export function checkMcpHealth(path: string): Promise<Record<string, string>> {
  return fetchJson(`${BASE}/mcp/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

// ── CC Launch ──
export function launchCc(): Promise<{ launched: boolean; error?: string }> {
  return fetchJson(`${BASE}/cc/launch`, { method: 'POST' })
}

// ── Stats / Projects ──
export function fetchProjectStats(): Promise<{ project: string; memoryCount: number; memoryByType: Record<string, number>; taskCount: number; taskByStatus: Record<string, number>; skillCount: number }[]> {
  return fetchJson(`${BASE}/stats/projects`)
}

// ── Stats / Charts ──
export function fetchChartStats(): Promise<{ date: string; sessions: number; tasks: number }[]> {
  return fetchJson(`${BASE}/stats/charts`)
}

// ── Task Schedule ──
export function updateTaskSchedule(id: string, action: 'pause' | 'resume' | 'cancel'): Promise<{ ok: boolean; schedule: any }> {
  return fetchJson(`${BASE}/tasks/${encodeURIComponent(id)}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

// ── Chat (streaming) ──
export function sendChatMessage(
  message: string,
  history: { role: string; content: string }[],
  onToken: (token: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
): AbortController {
  const ctrl = new AbortController()
  ;(async () => {
    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: ctrl.signal,
      })
      const reader = res.body?.getReader()
      if (!reader) { onError('No response body'); return }
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.token) { fullText += parsed.token; onToken(parsed.token) }
              if (parsed.error) onError(parsed.error)
              if (parsed.done) { onDone(fullText); return }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') onError(String(e.message))
    }
  })()
  return ctrl
}

// ── Chat Sessions ──
export function fetchChatSessions(): Promise<{ id: string; title: string; messageCount: number; tabCount: number; createdAt: number; updatedAt: number }[]> {
  return fetchJson(`${BASE}/chat/sessions`)
}

export function loadChatSession(id: string): Promise<{ id: string; title: string; messages: any[]; tabs: number; createdAt: number }> {
  return fetchJson(`${BASE}/chat/sessions/${encodeURIComponent(id)}`)
}

export function saveChatSession(data: { id?: string; title?: string; messages: any[]; tabs?: number; createdAt?: number }): Promise<{ saved: boolean; id: string }> {
  return fetchJson(`${BASE}/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function patchChatSession(id: string, patch: { favorite?: boolean; tags?: string[]; title?: string }): Promise<{ updated: boolean }> {
  return fetchJson(`${BASE}/chat/sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export function deleteChatSession(id: string): Promise<{ deleted: boolean }> {
  return fetchJson(`${BASE}/chat/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
