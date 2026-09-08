import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'

// Serves the Vite production build (dist/) directly — the frontend has no
// client-side router (App.tsx: "one screen transitioning to another, not
// deep-linkable routes"), so there's exactly one HTML entry point and no
// history-fallback to worry about.

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function contentType(filePath: string): string {
  return (
    MIME_TYPES[path.extname(filePath).toLowerCase()] ??
    'application/octet-stream'
  )
}

export function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  distDir: string,
): void {
  const url = new URL(req.url ?? '/', 'http://localhost')
  // Reject any path that could escape distDir (../, encoded traversal, etc.)
  // by resolving it and checking the result is still inside distDir — the
  // request path is attacker-controlled.
  const requestedPath = path.normalize(
    path.join(distDir, decodeURIComponent(url.pathname)),
  )
  if (!requestedPath.startsWith(distDir)) {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  // No client-side router exists to fall back for, so only "/" itself maps
  // to index.html — anything else missing is a genuine 404, not silently
  // served HTML (that would mask a broken/missing asset URL).
  const candidate =
    url.pathname === '/' ? path.join(distDir, 'index.html') : requestedPath

  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  res.writeHead(200, { 'Content-Type': contentType(candidate) })
  createReadStream(candidate).pipe(res)
}
