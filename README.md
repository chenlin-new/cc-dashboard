# CC Dashboard

A web dashboard for **Claude Code** — visualize memories, tasks, skills, MCP servers, plugins, chat sessions, and more. Built with React + Vite.

![Dashboard](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Quick Start

```bash
# Clone & install
git clone https://github.com/YOUR_USER/cc-dashboard.git
cd cc-dashboard
npm install

# Start dev server (opens on http://localhost:5173)
npm run dev
```

> **Requirements:** Node.js 18+, [Claude Code](https://claude.ai/code) installed (`~/.claude/` directory).

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats overview, memory/task charts, 7-day activity, project summary |
| **Chat** | Streaming Claude chat with tabs, split panes, chat/terminal modes 📡 |
| **Memory** | Browse and edit Claude Code memory files |
| **Tasks** | Kanban board + list view, task scheduling, inline execution |
| **Sessions** | Timeline of all Claude Code sessions with message detail viewer |
| **Skills** | Browse custom skills |
| **MCP** | Manage MCP server configs, health checks, **marketplace search & install** |
| **Plugins** | Browse installed plugins, **marketplace search & install** |
| **Agents** | Tree / DAG view of active agents |
| **Settings** | Edit Claude Code settings.json & settings.local.json |
| **Search** | Global search (Ctrl+K) across memories, tasks, skills |
| **Commands** | Quick command palette (Ctrl+P) |

## How It Works

The dashboard reads directly from your local `~/.claude/` directory — it does **not** modify Claude Code's internal files (except `.mcp.json` and plugin installs when you explicitly perform those actions).

```
~/.claude/
├── projects/    → Memories, .mcp.json, session JSONL files
├── tasks/       → Task definitions
├── skills/      → Custom skills
├── plugins/     → Installed plugins + marketplace
├── chats/       → Saved chat sessions (auto-saved from dashboard)
├── settings.json
└── .mcp.json    → Global MCP server config
```

The backend API is embedded as [Vite middleware](vite.config.ts) — no separate server process needed.

## MCP Marketplace

Search npm for MCP servers and install with one click:

1. Go to **MCP** → **市场** tab
2. Search keywords (e.g. "filesystem", "git", "database")
3. Click **安装** → optionally customize server name / target project
4. Server is added to `.mcp.json` — restart Claude Code to pick it up

## Plugin Marketplace

Search and install Claude Code plugins from npm:

1. Go to **插件** → **市场** tab
2. Search keywords
3. Click **安装** — plugin is npm-installed into `~/.claude/plugins/`

## Configuration

| Env var | Purpose |
|---------|---------|
| `CC_MCP_PATHS` | Colon-separated list of additional project paths to scan for `.mcp.json` |

## Build for Production

```bash
npm run build
npm run preview   # serves dist/ on http://localhost:4173
```

## Tech Stack

- **React 19** + TypeScript
- **Vite 6** + Tailwind CSS 4
- **Recharts** (charts)
- **Lucide React** (icons)
- **React Router** (SPA routing)
- **React Markdown** + remark-gfm (chat rendering)

## License

MIT
