import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only: route same-origin /api/* to the local Azure Functions runtime
  // (func start, :7071). In production, Azure Static Web Apps natively proxies
  // /api/* to its linked Functions app, so frontend fetch('/api/...') calls work
  // unchanged in both places without an environment-specific base URL.
  server: {
    proxy: {
      '/api': 'http://localhost:7071',
    },
    // Safety net, not the primary fix: local Azurite/Functions state (data
    // dirs, local.settings.json edits) belongs entirely outside this repo,
    // since Vite watches the whole project and a tool rewriting a file inside
    // it every few seconds triggers a full page reload — which killed a
    // running game mid-play and looked exactly like a crash (2026-09-07).
    // This glob is a backstop in case anything is ever run from inside the
    // repo again, not a reason to put such state here on purpose.
    watch: {
      ignored: ['**/.azurite-data/**', '**/api/local.settings.json'],
    },
  },
})
