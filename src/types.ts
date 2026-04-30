export interface MemoryItem {
  project: string
  filename: string
  name: string
  description: string
  type: string
  content: string
}

export interface TaskItem {
  id: string
  taskId: string
  subject: string
  description: string
  status: string
  activeForm?: string
  createdAt?: string
  schedule?: { scheduledAt: string; createdAt: string; paused?: boolean } | null
}

export interface TaskDetail {
  id: string
  items: TaskSubItem[]
}

export interface TaskSubItem {
  id: string
  subject: string
  description: string
  status: string
  activeForm?: string
  blocks?: string[]
  blockedBy?: string[]
}

export interface SkillItem {
  filename: string
  name: string
  description: string
  tags: string[]
  content: string
  source?: 'claude-global' | 'project' | 'custom'
  project?: string | null
}

export interface McpConfig {
  project: string
  path: string
  servers: Record<string, McpServer>
  source?: 'claude-project' | 'claude-root' | 'workspace' | 'custom'
}

export interface McpServer {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  type?: string
  _disabled?: boolean
  _disabled_reason?: string
  comment?: string
}

export interface PluginInfo {
  plugins: {
    version: number
    plugins: Record<string, PluginEntry[]>
  } | null
  marketplaces: any
  pluginDirs: string[]
}

export interface PluginEntry {
  scope: string
  projectPath?: string
  installPath: string
  version: string
  installedAt: string
  lastUpdated?: string
  gitCommitSha?: string
}

export interface AgentInfo {
  id: string
  subject: string
  description: string
  status: string
  activeForm?: string
  children?: AgentInfo[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface ChatPaneState {
  id: string
  messages: ChatMessage[]
  sending: boolean
  streamingId: number | null
  abortCtrl: AbortController | null
}

export interface ChatTabState {
  id: string
  title: string
  panes: ChatPaneState[]
  split: 1 | 2 | 3
}

export interface Settings {
  settings: Record<string, any> | null
  localSettings: Record<string, any> | null
}

export interface Stats {
  memoryCount: number
  memoryByType: Record<string, number>
  taskCount: number
  taskByStatus: Record<string, number>
  skillCount: number
  mcpServerCount: number
  pluginCount: number
}

export interface MarketplaceItem {
  name: string
  description: string
  version: string
  publisher: string
  links: { npm?: string; homepage?: string; repository?: string }
  date: string
  keywords: string[]
}
