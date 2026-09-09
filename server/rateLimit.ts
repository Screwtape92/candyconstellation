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

// Checked in priority order:
// 1. `cf-connecting-ip` — set by Cloudflare (including through a Cloudflare
//    Tunnel/cloudflared) to the real visitor IP. Preferred over
//    x-forwarded-for specifically for tunnelled traffic: cloudflared has a
//    known bug (cloudflare/cloudflared#1426) where x-forwarded-for reaching
//    the origin can be wrong/missing, while cf-connecting-ip is what
//    Cloudflare itself documents as the reliable header for this.
// 2. `x-forwarded-for` — set by ngrok's free tier, and by Azure Front
//    Door/SWA in the original deployment ("client, proxy1, proxy2, ...";
//    the leftmost entry is the original client).
// 3. The raw socket address, for a direct (non-tunnelled) connection.
export function getClientIp(req: IncomingMessage): string {
  const cfConnectingIp = req.headers['cf-connecting-ip']
  const cfRaw = Array.isArray(cfConnectingIp)
    ? cfConnectingIp[0]
    : cfConnectingIp
  if (cfRaw) {
    return sanitizeIp(cfRaw.trim())
  }

  const forwardedFor = req.headers['x-forwarded-for']
  const xffRaw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  if (xffRaw) {
    const [first] = xffRaw.split(',')
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

// Table name is only ever a hardcoded literal from the two calls below, never
// request-derived, so building the SQL string with it carries no injection
// risk. Factored out so submitScore and startRun (added 2026-09-09, see
// run_token_rate_limits in db.ts) can each get their own bucket/threshold
// without duplicating the read-increment-upsert logic.
function makeLimiter(tableName: string, max: number) {
  const readCountStmt = db.prepare(
    `SELECT count FROM ${tableName} WHERE client_ip = ? AND bucket = ?`,
  )
  const upsertCountStmt = db.prepare(
    `INSERT INTO ${tableName} (client_ip, bucket, count) VALUES (?, ?, ?)
     ON CONFLICT(client_ip, bucket) DO UPDATE SET count = excluded.count`,
  )

  // Increments this IP's counter for the current time bucket and reports
  // whether it's now over the limit — every call counts, regardless of the
  // eventual outcome, so a script hammering at the threshold can't dodge
  // being counted (same rule as the Azure path). node:sqlite is synchronous,
  // so there's no read-modify-write race window here the way there is with
  // the Table Storage version's separate get/upsert round-trips.
  return function incrementAndCheck(req: IncomingMessage): RateLimitResult {
    const clientIp = getClientIp(req)
    const bucket = getTimeBucket()

    const row = readCountStmt.get(clientIp, bucket) as
      { count: number } | undefined
    const count = (row?.count ?? 0) + 1
    upsertCountStmt.run(clientIp, bucket, count)

    return { clientIp, bucket, count, limited: count > max }
  }
}

export const incrementAndCheckRateLimit = makeLimiter(
  'rate_limits',
  RATE_LIMIT_MAX,
)

// Generous relative to RATE_LIMIT_MAX above — a real player restarting
// several times in a row ("instant restart") needs a fresh token per attempt,
// well before any of those runs reach submission, so this must not throttle
// normal replay behavior the way the submission limit intentionally does.
export const RUN_TOKEN_RATE_LIMIT_MAX = 30
export const incrementAndCheckRunTokenRateLimit = makeLimiter(
  'run_token_rate_limits',
  RUN_TOKEN_RATE_LIMIT_MAX,
)
