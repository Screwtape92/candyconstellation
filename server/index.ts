import { createServer } from 'node:http'
import path from 'node:path'
import './db.js'
import {
  handleSubmitScore,
  handleGetLeaderboard,
  handleStartRun,
  handleReportProgress,
} from './api.js'
import { serveStatic } from './staticFiles.js'

// Self-hosted entry point for the home-box + ngrok deployment path (see
// docs/architecture.md "Self-hosted deployment (home box + ngrok)"). One
// process, one port: serves the Vite production build and the two score
// endpoints from the same origin, so the frontend's same-origin
// fetch('/api/...') calls work completely unchanged from the Azure SWA path.

const PORT = Number(process.env.PORT ?? 8787)
// Compiled output lands at server/dist/server/index.js — three levels up is
// the repo root, then into the Vite build output.
const DIST_DIR = path.join(import.meta.dirname, '..', '..', '..', 'dist')

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (req.method === 'POST' && url.pathname === '/api/submitScore') {
    void handleSubmitScore(req, res)
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/startRun') {
    handleStartRun(req, res)
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/reportProgress') {
    void handleReportProgress(req, res)
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/getLeaderboard') {
    handleGetLeaderboard(req, res)
    return
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  serveStatic(req, res, DIST_DIR)
})

server.listen(PORT, () => {
  console.log(`Candy Constellation self-host server listening on :${PORT}`)
  console.log(`Serving frontend from ${DIST_DIR}`)
})
