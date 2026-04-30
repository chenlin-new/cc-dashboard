import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import MemoryPage from './pages/MemoryPage'
import MemoryDetailPage from './pages/MemoryDetailPage'
import TasksPage from './pages/TasksPage'
import SkillsPage from './pages/SkillsPage'
import McpPage from './pages/McpPage'
import PluginsPage from './pages/PluginsPage'
import AgentsPage from './pages/AgentsPage'
import SessionsPage from './pages/SessionsPage'
import ChatPage from './pages/ChatPage'
import ProjectPage from './pages/ProjectPage'
import SettingsPage from './pages/SettingsPage'
import ArthasPage from './pages/ArthasPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/memory" element={<MemoryPage />} />
        <Route path="/memory/:project/:filename" element={<MemoryDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/mcp" element={<McpPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/arthas" element={<ArthasPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/project/:projectName" element={<ProjectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
