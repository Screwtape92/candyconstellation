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
  },
})
