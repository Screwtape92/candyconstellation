import type { IncomingMessage } from 'node:http'
import { db } from './db.js'

// Self-hosted equivalent of api/shared/rateLimit.ts (docs/architecture.md
// "Rate-limiting") — same per-IP/10-minute-bucket policy, SQLite instead of
// a Table Storage RateLimits table.

const BUCKET_MS = 10 * 60 * 1000
export const RATE_LIMIT_MAX = 5

// Fixed key when no client IP can be determined at all (shouldn't happen in
// practice — every request has a socket address — but keeps this total).
const LOCAL_DEV_IP = 'local-dev'

// x-forwarded-for is attacker-controlled free-text and clientIp becomes a
// SQLite primary-key column, so restrict it to characters an IPv4/IPv6
// address can contain.
function sanitizeIp(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-fA-F:.]/g, '')
  return cleaned.length > 0 ? cleaned : LOCAL_DEV_IP
}

// ngrok's free tier terminates TLS and forwards to the local server with
// x-forwarded-for set to the real visitor IP, same shape as Azure Front
// Door/SWA in the original deployment ("client, proxy1, proxy2, ..."; the
// leftmost entry is the original client). Falls back to the raw socket
// address for a direct (non-tunnelled) connection.
export function getClientIp(req: IncomingMessage): string {
  const forwardedFor = req.headers['x-forwarded-for']
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  if (raw) {
    const [first] = raw.split(',')
    return sanitizeIp(first.trim())
  }
  return sanitizeIp(req.socket.remoteAddress ?? LOCAL_DEV_IP)
}

export function getTimeBucket(now: number = Date.now()): string {
  return String(Math.floor(now / BUCKET_MS))
}

export interface RateLimitResult {
  clientIp: string
  bucket: string
  count: number
  limited: boolean
}

const readCountStmt = db.prepare(
  'SELECT count FROM rate_limits WHERE client_ip = ? AND bucket = ?',
)
const upsertCountStmt = db.prepare(
  `INSERT INTO rate_limits (client_ip, bucket, count) VALUES (?, ?, ?)
   ON CONFLICT(client_ip, bucket) DO UPDATE SET count = excluded.count`,
)

// Increments this IP's counter for the current time bucket and reports
// whether it's now over the limit — every call counts, regardless of the
// eventual outcome, so a script hammering at the threshold can't dodge being
// counted (same rule as the Azure path). node:sqlite is synchronous, so
// there's no read-modify-write race window here the way there is with the
// Table Storage version's separate get/upsert round-trips.
export function incrementAndCheckRateLimit(
  req: IncomingMessage,
): RateLimitResult {
  const clientIp = getClientIp(req)
  const bucket = getTimeBucket()

  const row = readCountStmt.get(clientIp, bucket) as
    { count: number } | undefined
  const count = (row?.count ?? 0) + 1
  upsertCountStmt.run(clientIp, bucket, count)

  return { clientIp, bucket, count, limited: count > RATE_LIMIT_MAX }
}
