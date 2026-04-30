import fs from 'fs'
import path from 'path'
import os from 'os'

const TASKS_DIR = path.join(os.homedir(), '.claude', 'tasks')
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')

// SSE clients
const clients = new Set()

export function addSseClient(res) {
  clients.add(res)
  res.on('close', () => clients.delete(res))
}

export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const c of clients) {
    try { c.write(msg) } catch { clients.delete(c) }
  }
}

export function startWatcher() {
  // Polling-based: check for new/changed task dirs every 2s
  // Simplest approach that doesn't require chokidar as dependency
  let lastSnapshot = new Map()

  function scan() {
    const now = new Map()
    if (!fs.existsSync(TASKS_DIR)) return
    const entries = fs.readdirSync(TASKS_DIR)
    for (const entry of entries) {
      const taskDir = path.join(TASKS_DIR, entry)
      if (!fs.statSync(taskDir).isDirectory()) continue
      let mtime = 0
      try {
        const items = fs.readdirSync(taskDir).filter(f => f.endsWith('.json'))
        for (const item of items) {
          const stat = fs.statSync(path.join(taskDir, item))
          if (stat.mtimeMs > mtime) mtime = stat.mtimeMs
        }
        const firstJson = items.length > 0
          ? JSON.parse(fs.readFileSync(path.join(taskDir, items[0]), 'utf-8'))
          : null
        now.set(entry, { mtime, status: firstJson?.status || 'unknown', subject: firstJson?.subject || '' })
      } catch {}
    }

    // Detect new/changed
    for (const [id, info] of now) {
      const prev = lastSnapshot.get(id)
      if (!prev) {
        broadcast('agent_created', { id, ...info })
      } else if (prev.mtime !== info.mtime) {
        broadcast('agent_updated', { id, ...info })
      }
    }
    // Detect removed
    for (const [id] of lastSnapshot) {
      if (!now.has(id)) {
        broadcast('agent_removed', { id })
      }
    }
    lastSnapshot = now
  }

  // Scan every 2 seconds
  scan()
  return setInterval(scan, 2000)
}

// Also scan project directories for session activity
export function getProjectSessions() {
  const result = []
  if (!fs.existsSync(PROJECTS_DIR)) return result
  for (const project of fs.readdirSync(PROJECTS_DIR)) {
    const projDir = path.join(PROJECTS_DIR, project)
    if (!fs.statSync(projDir).isDirectory()) continue
    try {
      const files = fs.readdirSync(projDir).filter(f => f.endsWith('.jsonl'))
      const activeSessions = files
        .map(f => {
          const stat = fs.statSync(path.join(projDir, f))
          return { sessionId: f.replace('.jsonl', ''), project, size: stat.size, mtime: stat.mtimeMs }
        })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 10) // last 10 sessions
      result.push({ project, sessions: activeSessions })
    } catch {}
  }
  return result
}
