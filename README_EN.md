# CC Dashboard

A web dashboard for **Claude Code** — manage memories, tasks, skills, MCP servers, plugins, chat sessions, and more in one place.

![status](https://img.shields.io/badge/status-active-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)
![react](https://img.shields.io/badge/React-19-61dafb)
![vite](https://img.shields.io/badge/Vite-6-646cff)

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Stats overview, memory/task charts, 7-day activity, project breakdown |
| **Chat** | Streaming AI chat with multi-tab + split-pane layout, edit/copy/export to Markdown |
| **Memory** | Browse and edit Claude Code project memory files |
| **Tasks** | Kanban + list views, scheduling, batch operations, inline execution |
| **Sessions** | Timeline of all Claude Code sessions with search, favorites, and tags |
| **Skills** | Browse Markdown skill files, edit/preview with syntax highlighting, source badges |
| **MCP** | Manage MCP server configs, health checks, **marketplace search & one-click install** |
| **Plugins** | Installed plugin management, **NPM marketplace search & one-click install** |
| **Agents** | Agent tracking with tree and DAG views |
| **Settings** | Edit settings.json & settings.local.json in-app |
| **Search** | Ctrl+K global search across memories, tasks, skills |
| **Commands** | Ctrl+P command palette for quick navigation |

## Highlights

- 8 IDE-inspired themes (Deep Space, Dracula, Nord, One Dark, Monokai, Tokyo Night, Solarized, Light+)
- Bilingual UI (Chinese / English)
- Prompt template library with one-click fill
- Export conversations as Markdown
- Session favorites and tag management
- MCP / Plugin marketplace with search and one-click install

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USER/cc-dashboard.git
cd cc-dashboard
npm install

# Start dev server → http://localhost:5173
npm run dev
```

> **Prerequisites:** Node.js 18+, [Claude Code](https://claude.ai/code) installed (`~/.claude/` directory present).

## How It Works

The dashboard reads directly from your local `~/.claude/` directory — it does **not** modify Claude Code's internal files (except when you explicitly perform MCP config changes or plugin installs).

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

1. Navigate to **MCP** → **Market** tab
2. Search keywords (e.g. "filesystem", "git", "database")
3. Click **Install** — optionally customize server name
4. Server is added to `.mcp.json` — restart Claude Code to pick it up

## Plugin Marketplace

1. Navigate to **Plugins** → **Market** tab
2. Search keywords
3. Click **Install** — npm-installed into `~/.claude/plugins/`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CC_MCP_PATHS` | Colon-separated list of additional project paths to scan for `.mcp.json` |

## Production Build

```bash
npm run build
npm run preview   # Preview dist/ on http://localhost:4173
```

## Tech Stack

- **React 19** + TypeScript
- **Vite 6** + Tailwind CSS 4
- **Recharts** — Charts
- **Lucide React** — Icons
- **React Router 7** — SPA routing
- **React Markdown** + remark-gfm — Markdown rendering

## License

MIT
