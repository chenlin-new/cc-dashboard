import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleApi } from './server/api.js'
import { startWatcher } from './server/watcher.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-server',
      configureServer(server) {
        // Start background watcher
        let watcherTimer = null
        server.httpServer?.once('listening', () => {
          watcherTimer = startWatcher()
        })
        server.httpServer?.once('close', () => {
          if (watcherTimer) clearInterval(watcherTimer)
        })

        server.middlewares.use('/api', handleApi)
      },
    },
  ],
})
