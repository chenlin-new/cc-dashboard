import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import SearchModal from './SearchModal'
import CommandPalette from './CommandPalette'

export default function Layout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setCmdOpen(false)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setCmdOpen(true)
        setSearchOpen(false)
        return
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setCmdOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
