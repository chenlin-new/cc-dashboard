import path from 'path'
import fs from 'fs'
import os from 'os'
import { randomUUID } from 'crypto'
import { execSync, exec } from 'child_process'

const HOME = os.homedir()
const CLAUDE_DIR = path.join(HOME, '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks')
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills')
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins')
const CHATS_DIR = path.join(CLAUDE_DIR, 'chats')
if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR, { recursive: true })

const IS_WIN = process.platform === 'win32'
const ENV_PATH_SEP = IS_WIN ? ';' : ':'

function commandExists(cmd) {
  try { execSync(IS_WIN ? `where ${cmd}` : `which ${cmd}`, { stdio: 'ignore' }); return true } catch { return false }
}

// ─── Helpers ───────────────────────────────────

function readJsonSafe(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    }
  } catch {}
  return null
}

function writeJsonSafe(filepath, data) {
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
}

function parseFrontmatter(content) {
  const meta = {}
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (match) {
    for (const line of match[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.+)/)
      if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return meta
}

// ─── Memory ────────────────────────────────────

function walkMemoryDirs() {
  const results = []
  if (!fs.existsSync(PROJECTS_DIR)) return results
  const projects = fs.readdirSync(PROJECTS_DIR)
  for (const project of projects) {
    const memoryDir = path.join(PROJECTS_DIR, project, 'memory')
    if (!fs.existsSync(memoryDir)) continue
    const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8')
      const meta = parseFrontmatter(content)
      results.push({
        project,
        filename: file,
        name: meta.name || file.replace('.md', ''),
        description: meta.description || '',
        type: meta.type || 'unknown',
        content,
      })
    }
  }
  return results
}

// ─── Tasks ─────────────────────────────────────

function walkTasks() {
  const results = []
  if (!fs.existsSync(TASKS_DIR)) return results
  const entries = fs.readdirSync(TASKS_DIR)
  for (const entry of entries) {
    const taskDir = path.join(TASKS_DIR, entry)
    if (!fs.statSync(taskDir).isDirectory()) continue
    const items = fs.readdirSync(taskDir)
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => parseInt(a) - parseInt(b))
    if (items.length > 0) {
      const first = readJsonSafe(path.join(taskDir, items[0]))
      if (first) {
        results.push({
          id: entry,
          taskId: first.id,
          subject: first.subject,
          description: first.description,
          status: first.status,
          activeForm: first.activeForm || '',
          createdAt: first.createdAt || '',
        })
      }
    }
  }
  return results
}

function createTask({ subject, description, status = 'pending', scheduledAt = null }) {
  const uuid = randomUUID()
  const taskDir = path.join(TASKS_DIR, uuid)
  if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true })
  const now = new Date().toISOString()
  const task = {
    id: '1',
    subject,
    description: description || '',
    status,
    activeForm: '',
    blocks: [],
    blockedBy: [],
    createdAt: now,
    schedule: scheduledAt ? { scheduledAt, createdAt: now } : null,
  }
  writeJsonSafe(path.join(taskDir, '1.json'), task)
  return { id: uuid, ...task }
}

function updateTaskStatus(id, status) {
  const taskDir = path.join(TASKS_DIR, id)
  if (!fs.existsSync(taskDir)) return null
  const items = fs.readdirSync(taskDir)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => parseInt(a) - parseInt(b))
  if (items.length === 0) return null
  const filepath = path.join(taskDir, items[0])
  const task = readJsonSafe(filepath)
  if (!task) return null
  task.status = status
  writeJsonSafe(filepath, task)
  return task
}

function deleteTask(id) {
  const taskDir = path.join(TASKS_DIR, id)
  if (fs.existsSync(taskDir)) {
    fs.rmSync(taskDir, { recursive: true, force: true })
    return true
  }
  return false
}

// ─── Skills ────────────────────────────────────

function walkSkills() {
  const results = []

  // Helper: convert path-encoded directory name to actual filesystem path
  // macOS/Linux: -Users-lin-Desktop → /Users/lin/Desktop
  // Windows: C--Users-lin-Desktop → C:/Users/lin/Desktop
  function decodeProjectPath(name) {
    const decoded = name.replace(/-/g, '/')
    if (IS_WIN) {
      // Windows drive letter: C--Users → C:/Users
      return decoded.replace(/^(\w)\//, '$1:/')
    }
    return '/' + decoded.replace(/^-/, '')
  }

  // 1) Global skills: ~/.claude/skills/*.md
  if (fs.existsSync(SKILLS_DIR)) {
    for (const file of fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'))) {
      const filepath = path.join(SKILLS_DIR, file)
      try {
        const content = fs.readFileSync(filepath, 'utf-8')
        const meta = parseFrontmatter(content)
        results.push({
          filename: file,
          name: meta.name || file.replace('.md', ''),
          description: meta.description || '',
          tags: meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean) : [],
          content,
          source: 'claude-global',
          project: null,
        })
      } catch {}
    }
  }

  // 2) Project-level skills: <workspace>/.claude/skills/
  if (fs.existsSync(PROJECTS_DIR)) {
    for (const proj of fs.readdirSync(PROJECTS_DIR)) {
      const originalPath = decodeProjectPath(proj)
      const projSkillsDir = path.join(originalPath, '.claude', 'skills')
      // Skip if this is the same as the global skills dir
      if (!fs.existsSync(projSkillsDir) || projSkillsDir === SKILLS_DIR) continue
      try {
        const entries = fs.readdirSync(projSkillsDir)
        for (const entry of entries) {
          const entryPath = path.join(projSkillsDir, entry)
          if (fs.statSync(entryPath).isDirectory()) {
            // Skill directory: find SKILL.md or first .md
            const skillFile = fs.readdirSync(entryPath).find(f => f === 'SKILL.md') || fs.readdirSync(entryPath).find(f => f.endsWith('.md'))
            if (skillFile) {
              const content = fs.readFileSync(path.join(entryPath, skillFile), 'utf-8')
              const meta = parseFrontmatter(content)
              results.push({
                filename: `${entry}/SKILL.md`,
                name: meta.name || entry,
                description: meta.description || '',
                tags: meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean) : [],
                content,
                source: 'project',
                project: path.basename(originalPath),
              })
            }
          } else if (entry.endsWith('.md') && entry !== 'README.md') {
            // Top-level skill .md file (not README)
            const content = fs.readFileSync(entryPath, 'utf-8')
            const meta = parseFrontmatter(content)
            results.push({
              filename: entry,
              name: meta.name || entry.replace('.md', ''),
              description: meta.description || '',
              tags: meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean) : [],
              content,
              source: 'project',
              project: path.basename(originalPath),
            })
          }
        }
      } catch {}
    }
  }

  // 3) Custom paths via CC_MCP_PATHS (reuse for skills too)
  const extraPaths = (process.env.CC_MCP_PATHS || '').split(ENV_PATH_SEP).filter(Boolean)
  for (const extraPath of extraPaths) {
    const skillsPath = path.join(extraPath, '.claude', 'skills')
    if (!fs.existsSync(skillsPath)) continue
    try {
      for (const entry of fs.readdirSync(skillsPath)) {
        const entryPath = path.join(skillsPath, entry)
        if (fs.statSync(entryPath).isDirectory()) {
          const skillFile = fs.readdirSync(entryPath).find(f => f === 'SKILL.md') || fs.readdirSync(entryPath).find(f => f.endsWith('.md'))
          if (skillFile) {
            const content = fs.readFileSync(path.join(entryPath, skillFile), 'utf-8')
            const meta = parseFrontmatter(content)
            results.push({
              filename: `${entry}/SKILL.md`,
              name: meta.name || entry,
              description: meta.description || '',
              tags: meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean) : [],
              content,
              source: 'custom',
              project: path.basename(extraPath),
            })
          }
        } else if (entry.endsWith('.md') && entry !== 'README.md') {
          const content = fs.readFileSync(entryPath, 'utf-8')
          const meta = parseFrontmatter(content)
          results.push({
            filename: entry,
            name: meta.name || entry.replace('.md', ''),
            description: meta.description || '',
            tags: meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean) : [],
            content,
            source: 'custom',
            project: path.basename(extraPath),
          })
        }
      }
    } catch {}
  }

  return results
}

function saveSkill(filename, content) {
  const filepath = path.join(SKILLS_DIR, filename)
  if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true })
  fs.writeFileSync(filepath, content, 'utf-8')
  return { filename, saved: true }
}

// ─── MCP ───────────────────────────────────────

function findMcpConfigs() {
  const results = []

  // Helper: convert path-encoded directory name to actual filesystem path
  // e.g. "-Users-lin-Desktop-work-pms" -> "/Users/lin/Desktop/work/pms"
  function decodeProjectPath(name) {
    return '/' + name.replace(/^-/, '').replace(/-/g, '/')
  }

  // Check project directories in ~/.claude/projects/
  if (fs.existsSync(PROJECTS_DIR)) {
    for (const project of fs.readdirSync(PROJECTS_DIR)) {
      // First check if there's a .mcp.json directly inside the .claude project dir
      const mcpPath = path.join(PROJECTS_DIR, project, '.mcp.json')
      if (fs.existsSync(mcpPath)) {
        const data = readJsonSafe(mcpPath)
        if (data) results.push({ project, path: mcpPath, servers: data.mcpServers || data, source: 'claude-project' })
        continue
      }
      // If not, try the original project path derived from directory name
      const originalPath = decodeProjectPath(project)
      const origMcpPath = path.join(originalPath, '.mcp.json')
      if (fs.existsSync(origMcpPath)) {
        const data = readJsonSafe(origMcpPath)
        if (data) results.push({
          project: path.basename(originalPath),
          path: origMcpPath,
          servers: data.mcpServers || data,
          source: 'workspace',
        })
      }
    }
  }
  // Also check ~/.claude/ for root-level .mcp.json
  const rootMcp = path.join(CLAUDE_DIR, '.mcp.json')
  if (fs.existsSync(rootMcp)) {
    const data = readJsonSafe(rootMcp)
    if (data) results.push({ project: '__root__', path: rootMcp, servers: data.mcpServers || data, source: 'claude-root' })
  }
  // Read user-configured custom paths from dashboard config
  const customPaths = getCustomMcpPaths()
  for (const projectPath of customPaths) {
    const mcpPath = path.join(projectPath, '.mcp.json')
    if (fs.existsSync(mcpPath)) {
      const data = readJsonSafe(mcpPath)
      if (data) results.push({
        project: path.basename(projectPath),
        path: mcpPath,
        servers: data.mcpServers || data,
        source: 'custom',
      })
    }
  }
  // Support CC_MCP_PATHS env var for extra project paths (colon-separated)
  const envPaths = (process.env.CC_MCP_PATHS || '').split(ENV_PATH_SEP).filter(Boolean)
  for (const projectPath of envPaths) {
    if (customPaths.includes(projectPath)) continue // deduplicate
    const mcpPath = path.join(projectPath, '.mcp.json')
    if (fs.existsSync(mcpPath)) {
      const data = readJsonSafe(mcpPath)
      if (data) results.push({
        project: path.basename(projectPath),
        path: mcpPath,
        servers: data.mcpServers || data,
        source: 'custom',
      })
    }
  }
  return results
}

const DASHBOARD_CONFIG = path.join(CHATS_DIR, 'cc-dashboard.json')

function getCustomMcpPaths() {
  const cfg = readJsonSafe(DASHBOARD_CONFIG)
  return cfg?.mcpPaths || []
}

function saveCustomMcpPaths(paths) {
  const cfg = readJsonSafe(DASHBOARD_CONFIG) || {}
  writeJsonSafe(DASHBOARD_CONFIG, { ...cfg, mcpPaths: paths })
}

// ─── Plugins ───────────────────────────────────

function getInstalledPlugins() {
  const pluginFile = path.join(PLUGINS_DIR, 'installed_plugins.json')
  const mktFile = path.join(PLUGINS_DIR, 'known_marketplaces.json')
  return {
    plugins: readJsonSafe(pluginFile),
    marketplaces: readJsonSafe(mktFile),
    pluginDirs: fs.existsSync(PLUGINS_DIR)
      ? fs.readdirSync(PLUGINS_DIR).filter(d => !d.includes('.'))
      : [],
  }
}

// ─── Agent Tracking ────────────────────────────

// SSE clients
const sseClients = new Set()

function addSseClient(res) {
  sseClients.add(res)
  res.on('close', () => sseClients.delete(res))
}

function broadcastSse(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of sseClients) {
    try { client.write(msg) } catch { sseClients.delete(client) }
  }
}

function getActiveAgents() {
  const allTasks = walkTasks()
  // Build a tree structure: look for parent-child relationships
  const agents = allTasks.map(t => ({
    id: t.id,
    subject: t.subject,
    description: t.description,
    status: t.status,
    activeForm: t.activeForm,
    children: [],
  }))
  return agents
}

// ─── CC Execution ──────────────────────────────

function executeInCc(taskId, subject) {
  try {
    const flagDir = path.join(CLAUDE_DIR, 'tasks', taskId)
    if (!fs.existsSync(flagDir)) fs.mkdirSync(flagDir, { recursive: true })
    const escaped = subject.replace(/"/g, '\\"')
    if (IS_WIN) {
      const cmd = `start cmd /c "cd /d %USERPROFILE% && echo ${escaped} | claude"`
      execSync(cmd, { timeout: 5000, windowsHide: false })
    } else {
      const cmd = `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "cd ~ && echo \\"${escaped}\\" | claude"'`
      execSync(cmd, { timeout: 5000 })
    }
    return { launched: true }
  } catch (e) {
    return { launched: false, error: e.message }
  }
}

function launchCc() {
  try {
    if (IS_WIN) {
      execSync(`start cmd /c "cd /d %USERPROFILE% && claude"`, { timeout: 5000, windowsHide: false })
    } else {
      execSync(`osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "cd ~ && claude"'`, { timeout: 5000 })
    }
    return { launched: true }
  } catch (e) {
    return { launched: false, error: e.message }
  }
}

// ─── Stats ─────────────────────────────────────

function getStats() {
  const memories = walkMemoryDirs()
  const tasks = walkTasks()
  const skills = walkSkills()
  const mcp = findMcpConfigs()
  const pluginInfo = getInstalledPlugins()
  return {
    memoryCount: memories.length,
    memoryByType: memories.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1; return acc
    }, {}),
    taskCount: tasks.length,
    taskByStatus: tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1; return acc
    }, {}),
    skillCount: skills.length,
    mcpServerCount: mcp.reduce((total, cfg) => total + Object.keys(cfg.servers).length, 0),
    pluginCount: pluginInfo.plugins ? Object.keys(pluginInfo.plugins.plugins || {}).length : 0,
  }
}

function getProjectStats() {
  const projects = {}
  // Memories per project
  for (const m of walkMemoryDirs()) {
    if (!projects[m.project]) projects[m.project] = { project: m.project, memoryCount: 0, memoryByType: {}, taskCount: 0, taskByStatus: {}, skillCount: 0 }
    projects[m.project].memoryCount++
    projects[m.project].memoryByType[m.type] = (projects[m.project].memoryByType[m.type] || 0) + 1
  }
  // Skills (count per project — global, but attribute to first project for display)
  const skillCount = walkSkills().length
  // Tasks per project (using project heuristic from memory)
  for (const t of walkTasks()) {
    const proj = Object.keys(projects)[0] || '__global__'
    if (!projects[proj]) projects[proj] = { project: proj, memoryCount: 0, memoryByType: {}, taskCount: 0, taskByStatus: {}, skillCount: 0 }
    projects[proj].taskCount++
    projects[proj].taskByStatus[t.status] = (projects[proj].taskByStatus[t.status] || 0) + 1
  }
  // Add skill count to first project
  if (Object.keys(projects).length > 0) {
    projects[Object.keys(projects)[0]].skillCount = skillCount
  }
  return Object.values(projects).sort((a, b) => b.memoryCount - a.memoryCount)
}

function getChartStats() {
  const now = Date.now()
  const dayMs = 86400000
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, sessions: 0, tasks: 0 })
  }
  // Count sessions by date
  if (fs.existsSync(PROJECTS_DIR)) {
    for (const project of fs.readdirSync(PROJECTS_DIR)) {
      const projDir = path.join(PROJECTS_DIR, project)
      if (!fs.statSync(projDir).isDirectory()) continue
      for (const file of fs.readdirSync(projDir).filter(f => f.endsWith('.jsonl'))) {
        try {
          const stat = fs.statSync(path.join(projDir, file))
          const d = new Date(stat.mtimeMs).toISOString().slice(0, 10)
          const day = days.find(x => x.date === d)
          if (day) day.sessions++
        } catch {}
      }
    }
  }
  // Count tasks created in last 7 days
  for (const t of walkTasks()) {
    if (t.createdAt) {
      const d = t.createdAt.slice(0, 10)
      const day = days.find(x => x.date === d)
      if (day) day.tasks++
    }
  }
  return days
}

// ─── Local Context Builder (skills + plugins for chat) ──
function buildLocalContext() {
  const parts = []
  // Skills
  const skills = walkSkills()
  if (skills.length > 0) {
    parts.push('## 可用的技能 (Skills)\n\n你拥有以下自定义技能文件，用户可以通过 `/技能名` 调用它们：')
    for (const s of skills) {
      parts.push(`- **${s.name}**${s.description ? `: ${s.description}` : ''}${s.tags.length ? ` \`${s.tags.join('`, `')}\`` : ''}`)
    }
  }
  // Plugins
  try {
    const pluginFile = path.join(PLUGINS_DIR, 'installed_plugins.json')
    if (fs.existsSync(pluginFile)) {
      const data = readJsonSafe(pluginFile)
      if (data && data.plugins) {
        const names = Object.keys(data.plugins)
        if (names.length > 0) {
          parts.push('\n## 已安装的插件\n\n' + names.map(n => `- \`${n}\``).join('\n'))
        }
      }
    }
  } catch {}
  // Projects summary
  try {
    const projects = fs.readdirSync(PROJECTS_DIR).filter(p => {
      const s = fs.statSync(path.join(PROJECTS_DIR, p))
      return s.isDirectory() && fs.existsSync(path.join(PROJECTS_DIR, p, 'memory'))
    })
    if (projects.length > 0) {
      parts.push('\n## 项目\n\n你有以下 Claude Code 项目目录：\n' + projects.map(p => `- \`${p}\``).join('\n'))
    }
  } catch {}

  if (parts.length === 0) return ''
  return '你是 Claude Code，运行在用户的本地 Dashboard 中。以下是你的本地环境和可用资源：\n\n' + parts.join('\n')
}

// ─── Unified Router ────────────────────────────

export async function handleApi(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname.replace('/api', '').replace(/\/$/, '')
  const segs = pathname.split('/').filter(Boolean)

  try {
    // SSE - agent event stream
    if (pathname === '/agents/stream') {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      addSseClient(res)
      return
    }

    // GET /api/stats
    if (pathname === '/stats') {
      res.end(JSON.stringify(getStats()))
      return
    }

    // ── Memory ──
    if (pathname === '/memory' && req.method === 'GET') {
      res.end(JSON.stringify(walkMemoryDirs()))
      return
    }
    if (segs[0] === 'memory' && segs.length === 3 && req.method === 'GET') {
      const [, project, filename] = segs
      const filepath = path.join(PROJECTS_DIR, project, 'memory', filename)
      if (!fs.existsSync(filepath)) {
        res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return
      }
      res.end(JSON.stringify({ project, filename, content: fs.readFileSync(filepath, 'utf-8') }))
      return
    }
    if (segs[0] === 'memory' && segs.length === 3 && req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const { content } = JSON.parse(body)
        const [, project, filename] = segs
        const filepath = path.join(PROJECTS_DIR, project, 'memory', filename)
        const dir = path.dirname(filepath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(filepath, content, 'utf-8')
        res.end(JSON.stringify({ saved: true, path: filepath }))
      })
      return
    }

    // ── Tasks ──
    if (pathname === '/tasks' && req.method === 'GET') {
      res.end(JSON.stringify(walkTasks()))
      return
    }
    if (pathname === '/tasks' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const data = JSON.parse(body)
        const result = createTask(data)
        broadcastSse('task_created', result)
        res.end(JSON.stringify(result))
      })
      return
    }
    if (segs[0] === 'tasks' && segs[1] && req.method === 'GET') {
      const taskDir = path.join(TASKS_DIR, segs[1])
      if (!fs.existsSync(taskDir)) {
        res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return
      }
      const items = fs.readdirSync(taskDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(f => readJsonSafe(path.join(taskDir, f)))
        .filter(Boolean)
      res.end(JSON.stringify({ id: segs[1], items }))
      return
    }
    // PUT /api/tasks/:id/status
    if (segs[0] === 'tasks' && segs[2] === 'status' && req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const { status } = JSON.parse(body)
        const result = updateTaskStatus(segs[1], status)
        if (result) {
          broadcastSse('task_updated', { id: segs[1], status })
          res.end(JSON.stringify(result))
        } else {
          res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' }))
        }
      })
      return
    }
    // DELETE /api/tasks/:id
    if (segs[0] === 'tasks' && segs[1] && req.method === 'DELETE') {
      const ok = deleteTask(segs[1])
      if (ok) {
        broadcastSse('task_deleted', { id: segs[1] })
        res.end(JSON.stringify({ deleted: true }))
      } else {
        res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' }))
      }
      return
    }
    // POST /api/tasks/:id/execute
    if (segs[0] === 'tasks' && segs[2] === 'execute' && req.method === 'POST') {
      const taskDir = path.join(TASKS_DIR, segs[1])
      const first = fs.readdirSync(taskDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b))
      if (first.length > 0) {
        const task = readJsonSafe(path.join(taskDir, first[0]))
        if (task) {
          const result = executeInCc(segs[1], task.subject)
          res.end(JSON.stringify(result))
          return
        }
      }
      res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    // ── Skills ──
    if (pathname === '/skills' && req.method === 'GET') {
      res.end(JSON.stringify(walkSkills()))
      return
    }
    if (pathname === '/skills' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const { filename, content } = JSON.parse(body)
        const result = saveSkill(filename, content)
        res.end(JSON.stringify(result))
      })
      return
    }
    if (segs[0] === 'skills' && req.method === 'GET') {
      const filename = decodeURIComponent(segs.slice(1).join('/'))
      const filepath = path.join(SKILLS_DIR, filename)
      if (!fs.existsSync(filepath)) {
        res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return
      }
      res.end(JSON.stringify({
        filename,
        content: fs.readFileSync(filepath, 'utf-8'),
      }))
      return
    }

    // ── MCP ──
    if (pathname === '/mcp' && req.method === 'GET') {
      res.end(JSON.stringify(findMcpConfigs()))
      return
    }
    if (pathname === '/mcp' && req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const data = JSON.parse(body)
        if (data.path && fs.existsSync(path.dirname(data.path))) {
          // Validate: only write known .mcp.json paths
          if (data.path.endsWith('.mcp.json')) {
            const payload = data.mcpServers ? { mcpServers: data.mcpServers } : data
            writeJsonSafe(data.path, payload)
            res.end(JSON.stringify({ saved: true, path: data.path }))
            return
          }
        }
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Invalid path or file' }))
      })
      return
    }

    // ── Plugins ──
    if (pathname === '/plugins') {
      res.end(JSON.stringify(getInstalledPlugins()))
      return
    }

    // ── Agents ──
    if (pathname === '/agents') {
      res.end(JSON.stringify(getActiveAgents()))
      return
    }

    // ── Settings ──
    if (pathname === '/settings' && req.method === 'GET') {
      const settings = readJsonSafe(path.join(CLAUDE_DIR, 'settings.json'))
      const localSettings = readJsonSafe(path.join(CLAUDE_DIR, 'settings.local.json'))
      res.end(JSON.stringify({ settings, localSettings }))
      return
    }
    if (segs[0] === 'settings' && req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const { type, content } = JSON.parse(body)
        const filepath = type === 'local'
          ? path.join(CLAUDE_DIR, 'settings.local.json')
          : path.join(CLAUDE_DIR, 'settings.json')
        writeJsonSafe(filepath, content)
        res.end(JSON.stringify({ saved: true, path: filepath }))
      })
      return
    }

    // ── Search ──
    if (pathname === '/search' && req.method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase()
      const results = []
      if (q.length >= 1) {
        for (const m of walkMemoryDirs()) {
          if (m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.content.toLowerCase().slice(0, 500).includes(q))
            results.push({ type: 'memory', title: m.name, desc: m.description, link: `/memory/${encodeURIComponent(m.project)}/${encodeURIComponent(m.filename)}` })
        }
        for (const t of walkTasks()) {
          if ((t.subject || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
            results.push({ type: 'task', title: t.subject, desc: t.description, link: `/tasks` })
        }
        for (const s of walkSkills()) {
          if (s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.content.toLowerCase().slice(0, 500).includes(q))
            results.push({ type: 'skill', title: s.name, desc: s.description, link: `/skills` })
        }
      }
      res.end(JSON.stringify({ query: q, results: results.slice(0, 30) }))
      return
    }

    // ── Sessions / Timeline ──
    if (pathname === '/sessions' && req.method === 'GET') {
      const sessions = []
      if (fs.existsSync(PROJECTS_DIR)) {
        for (const project of fs.readdirSync(PROJECTS_DIR)) {
          const projDir = path.join(PROJECTS_DIR, project)
          if (!fs.statSync(projDir).isDirectory()) continue
          for (const file of fs.readdirSync(projDir).filter(f => f.endsWith('.jsonl'))) {
            try {
              const stat = fs.statSync(path.join(projDir, file))
              const fd = fs.openSync(path.join(projDir, file), 'r')
              const buf = Buffer.alloc(4096)
              const bytes = fs.readSync(fd, buf, 0, 4096, 0)
              fs.closeSync(fd)
              let firstMsg = ''
              for (const line of buf.toString('utf-8', 0, bytes).split('\n').filter(Boolean)) {
                try { const d = JSON.parse(line); if (d.type === 'user') { const t = typeof d.message === 'string' ? d.message : d.message?.text || d.message?.content?.[0]?.text || ''; if (t) { firstMsg = t.slice(0, 120); break } } } catch {}
              }
              sessions.push({ id: file.replace('.jsonl', ''), project, size: stat.size, mtime: stat.mtimeMs, firstMsg })
            } catch {}
          }
        }
      }
      sessions.sort((a, b) => b.mtime - a.mtime)
      res.end(JSON.stringify(sessions))
      return
    }

    // ── Session Detail ──
    if (segs[0] === 'sessions' && segs[1] && segs[2] && req.method === 'GET') {
      const filepath = path.join(PROJECTS_DIR, segs[1], `${segs[2]}.jsonl`)
      if (!fs.existsSync(filepath)) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
        return
      }
      const lines = fs.readFileSync(filepath, 'utf-8').split('\n').filter(Boolean)
      const messages = lines.map(line => { try { return JSON.parse(line) } catch { return null } }).filter(Boolean)
      res.end(JSON.stringify({ project: segs[1], id: segs[2], messages }))
      return
    }

    // ── MCP Health Check ──
    if (pathname === '/mcp/health' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        const { path: mcpPath } = JSON.parse(body)
        const cfg = readJsonSafe(mcpPath)
        if (!cfg) { res.end(JSON.stringify({})); return }
        const servers = cfg.mcpServers || cfg
        const results = {}
        for (const [name, srv] of Object.entries(servers)) {
          if (srv._disabled) { results[name] = 'disabled'; continue }
          if (srv.url) {
            try { const c = new AbortController(); setTimeout(() => c.abort(), 3000); const r = await fetch(srv.url, { signal: c.signal }); results[name] = r.ok ? 'online' : 'error' }
            catch { results[name] = 'offline' }
          } else if (srv.command) {
            try { if (commandExists(srv.command.split(' ')[0])) results[name] = 'installed' }
            catch { results[name] = 'not-found' }
          } else { results[name] = 'unknown' }
        }
        res.end(JSON.stringify(results))
      })
      return
    }

    // ── MCP Marketplace ──
    if (pathname === '/mcp/marketplace' && req.method === 'GET') {
      const q = url.searchParams.get('q') || ''
      try {
        const searchUrl = q
          ? `https://registry.npmjs.org/-/v1/search?text=keywords:mcp-server+${encodeURIComponent(q)}&size=30`
          : 'https://registry.npmjs.org/-/v1/search?text=keywords:mcp-server&size=30'
        const npmRes = await fetch(searchUrl)
        const npmData = await npmRes.json()
        const results = (npmData.objects || []).map(o => ({
          name: o.package.name,
          description: o.package.description,
          version: o.package.version,
          publisher: o.package.publisher?.username || o.package.author?.name || '',
          links: o.package.links,
          date: o.package.date,
          keywords: o.package.keywords || [],
        }))
        res.end(JSON.stringify({ query: q, results }))
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: String(e.message), results: [] }))
      }
      return
    }

    // ── MCP Install ──
    if (pathname === '/mcp/install' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { name, packageName, projectPath } = JSON.parse(body)
          if (!name || !packageName) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Name and packageName required' })); return }

          // Determine which .mcp.json to modify
          const targetPath = projectPath
            ? path.join(projectPath, '.mcp.json')
            : path.join(CLAUDE_DIR, '.mcp.json')

          let config = readJsonSafe(targetPath) || {}
          if (!config.mcpServers) config.mcpServers = {}

          config.mcpServers[name] = {
            command: 'npx',
            args: ['-y', packageName],
          }

          writeJsonSafe(targetPath, config)
          res.end(JSON.stringify({ installed: true, path: targetPath, name, packageName }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e.message) }))
        }
      })
      return
    }

    // ── MCP Custom Paths ──
    if (pathname === '/mcp/paths' && req.method === 'GET') {
      res.end(JSON.stringify({ paths: getCustomMcpPaths() }))
      return
    }
    if (pathname === '/mcp/paths' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { path: newPath, remove } = JSON.parse(body)
          const current = getCustomMcpPaths()
          if (remove) {
            saveCustomMcpPaths(current.filter(p => p !== remove))
            res.end(JSON.stringify({ paths: getCustomMcpPaths() }))
          } else if (newPath) {
            if (current.includes(newPath)) {
              res.end(JSON.stringify({ paths: current }))
            } else {
              saveCustomMcpPaths([...current, newPath])
              res.end(JSON.stringify({ paths: getCustomMcpPaths() }))
            }
          } else {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'path or remove required' }))
          }
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e.message) }))
        }
      })
      return
    }

    // ── Plugin Marketplace ──
    if (pathname === '/plugins/marketplace' && req.method === 'GET') {
      const q = url.searchParams.get('q') || ''
      try {
        // Search npm for claude-code plugins
        const searchUrl = q
          ? `https://registry.npmjs.org/-/v1/search?text=keywords:claude-code+plugin+${encodeURIComponent(q)}&size=30`
          : 'https://registry.npmjs.org/-/v1/search?text=keywords:claude-code+plugin&size=30'
        const npmRes = await fetch(searchUrl)
        const npmData = await npmRes.json()
        const results = (npmData.objects || []).map(o => ({
          name: o.package.name,
          description: o.package.description,
          version: o.package.version,
          publisher: o.package.publisher?.username || o.package.author?.name || '',
          links: o.package.links,
          date: o.package.date,
          keywords: o.package.keywords || [],
        }))
        res.end(JSON.stringify({ query: q, results }))
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: String(e.message), results: [] }))
      }
      return
    }

    // ── Plugin Install ──
    if (pathname === '/plugins/install' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { packageName, scope = 'user' } = JSON.parse(body)
          if (!packageName) { res.statusCode = 400; res.end(JSON.stringify({ error: 'packageName required' })); return }

          // Install npm package into plugins directory
          const installDir = path.join(PLUGINS_DIR)
          if (!fs.existsSync(installDir)) fs.mkdirSync(installDir, { recursive: true })

          exec(`npm install ${packageName} --prefix ${installDir}`, { timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: error.message, stderr }))
              return
            }
            // Update installed_plugins.json
            const pluginFile = path.join(PLUGINS_DIR, 'installed_plugins.json')
            const current = readJsonSafe(pluginFile) || { version: 1, plugins: {} }
            if (!current.plugins) current.plugins = {}
            current.plugins[packageName] = current.plugins[packageName] || []
            current.plugins[packageName].push({
              scope,
              installPath: path.join(installDir, 'node_modules', packageName),
              version: '',
              installedAt: new Date().toISOString(),
            })
            writeJsonSafe(pluginFile, current)
            res.end(JSON.stringify({ installed: true, packageName, scope }))
          })
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e.message) }))
        }
      })
      return
    }

    // ── CC Launch ──
    if (pathname === '/cc/launch' && req.method === 'POST') {
      res.end(JSON.stringify(launchCc()))
      return
    }

    // ── Chat (streaming via NDJSON) ──
    if (pathname === '/chat' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { message, history = [] } = JSON.parse(body)
          if (!message || !message.trim()) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Message is required' }))
            return
          }

          // Build Anthropic messages format
          const msgs = history.map((h) => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content,
          }))
          msgs.push({ role: 'user', content: message })

          // Read settings to get API config
          const settings = readJsonSafe(path.join(CLAUDE_DIR, 'settings.json')) || {}
          const env = settings.env || {}
          const baseUrl = (env.ANTHROPIC_BASE_URL || '').replace(/\/+$/, '')
          const apiKey = env.ANTHROPIC_AUTH_TOKEN || ''
          // Use model from settings but strip provider prefix (e.g. "aliyun/deepseek-v4-pro" -> "deepseek-v4-pro")
          const rawModel = env.ANTHROPIC_MODEL || 'deepseek-v4-pro'
          const model = rawModel.includes('/') ? rawModel.split('/').pop() : rawModel
          const streamUrl = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages'

          // Build local context (skills, plugins, projects)
          const localContext = buildLocalContext()

          if (!apiKey) {
            // Fallback to claude CLI if no API key
            const systemCtx = localContext ? `[System Context]\n${localContext}\n[/System Context]\n\n` : ''
            const context = history.map((h) =>
              h.role === 'user' ? `User: ${h.content}` : `Claude: ${h.content}`
            ).join('\n\n')
            const prompt = context ? `${systemCtx}${context}\n\nUser: ${message}\n\nClaude:` : `${systemCtx}${message}`
            const result = execSync(`claude -p "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
              timeout: 120000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8',
            })
            res.setHeader('Content-Type', 'text/event-stream')
            res.write(`data: ${JSON.stringify({ token: result.trim() })}\n\n`)
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
            res.end()
            return
          }

          // Streaming API call
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')

          const apiBody = {
            model,
            max_tokens: 4096,
            stream: true,
            messages: msgs,
          }
          if (localContext) apiBody.system = localContext

          const apiRes = await fetch(`${streamUrl}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(apiBody),
          })

          if (!apiRes.ok) {
            const errText = await apiRes.text()
            res.write(`data: ${JSON.stringify({ error: `API ${apiRes.status}: ${errText}` })}\n\n`)
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
            res.end()
            return
          }

          const reader = apiRes.body?.getReader()
          if (!reader) throw new Error('No response body')

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
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    fullText += parsed.delta.text
                    res.write(`data: ${JSON.stringify({ token: parsed.delta.text })}\n\n`)
                  }
                } catch {}
              }
            }
          }

          res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`)
          res.end()
        } catch (e) {
          res.setHeader('Content-Type', 'text/event-stream')
          res.write(`data: ${JSON.stringify({ error: String(e.message) })}\n\n`)
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          res.end()
        }
      })
      return
    }

    // ── Stats / Projects ──
    if (pathname === '/stats/projects' && req.method === 'GET') {
      res.end(JSON.stringify(getProjectStats()))
      return
    }

    // ── Stats / Charts ──
    if (pathname === '/stats/charts' && req.method === 'GET') {
      res.end(JSON.stringify(getChartStats()))
      return
    }

    // ── Task Schedule ──
    if (segs[0] === 'tasks' && segs[2] === 'schedule' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        const { action } = JSON.parse(body)
        const taskDir = path.join(TASKS_DIR, segs[1])
        if (!fs.existsSync(taskDir)) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return }
        const items = fs.readdirSync(taskDir).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a) - parseInt(b))
        if (items.length === 0) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return }
        const filepath = path.join(taskDir, items[0])
        const task = readJsonSafe(filepath)
        if (!task) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return }
        if (action === 'pause') { task.schedule = task.schedule || {}; task.schedule.paused = true }
        else if (action === 'resume') { if (task.schedule) task.schedule.paused = false }
        else if (action === 'cancel') { task.schedule = null }
        writeJsonSafe(filepath, task)
        broadcastSse('task_updated', { id: segs[1], status: task.status, schedule: task.schedule })
        res.end(JSON.stringify({ ok: true, schedule: task.schedule }))
      })
      return
    }

    // ── Chat Sessions (persistence) ──
    if (pathname === '/chat/sessions' && req.method === 'GET') {
      const sessions = []
      if (fs.existsSync(CHATS_DIR)) {
        for (const file of fs.readdirSync(CHATS_DIR).filter(f => f.endsWith('.json'))) {
          try {
            const data = readJsonSafe(path.join(CHATS_DIR, file))
            if (data) {
              const firstUser = data.messages?.find(m => m.role === 'user')
              sessions.push({
                id: file.replace('.json', ''),
                title: data.title || firstUser?.content?.slice(0, 60) || '无标题',
                messageCount: data.messages?.length || 0,
                tabCount: data.tabs || 1,
                createdAt: data.createdAt || 0,
                updatedAt: data.updatedAt || 0,
                favorite: data.favorite || false,
                tags: data.tags || [],
              })
            }
          } catch {}
        }
      }
      sessions.sort((a, b) => b.updatedAt - a.updatedAt)
      res.end(JSON.stringify(sessions))
      return
    }

    if (segs[0] === 'chat' && segs[1] === 'sessions' && segs[2] && req.method === 'GET') {
      const filepath = path.join(CHATS_DIR, `${segs[2]}.json`)
      if (!fs.existsSync(filepath)) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
        return
      }
      res.end(JSON.stringify(readJsonSafe(filepath)))
      return
    }

    if (pathname === '/chat/sessions' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const data = JSON.parse(body)
          const id = data.id || randomUUID()
          const filepath = path.join(CHATS_DIR, `${id}.json`)
          writeJsonSafe(filepath, data)
          res.end(JSON.stringify({ saved: true, id }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
      return
    }

    if (segs[0] === 'chat' && segs[1] === 'sessions' && segs[2] && req.method === 'PATCH') {
      const filepath = path.join(CHATS_DIR, `${segs[2]}.json`)
      if (!fs.existsSync(filepath)) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
        return
      }
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const patch = JSON.parse(body)
          const data = readJsonSafe(filepath) || {}
          if ('favorite' in patch) data.favorite = patch.favorite
          if ('tags' in patch) data.tags = patch.tags
          if ('title' in patch) data.title = patch.title
          writeJsonSafe(filepath, data)
          res.end(JSON.stringify({ updated: true }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
      return
    }

    if (segs[0] === 'chat' && segs[1] === 'sessions' && segs[2] && req.method === 'DELETE') {
      const filepath = path.join(CHATS_DIR, `${segs[2]}.json`)
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
        res.end(JSON.stringify({ deleted: true }))
      } else {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
      }
      return
    }

    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (err) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: String(err) }))
  }
}
