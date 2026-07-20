import { type HttpRequest } from '@azure/functions'
import { RestError } from '@azure/data-tables'
import {
  ensureTablesReady,
  getRateLimitsTableClient,
} from './tableStorageClient'

// Per-IP rate limiting for submitScore (docs/architecture.md "Rate-limiting").
// With no auth there's no identity to throttle by, so this guards the
// insert-only Scores write against single-source scripted spam. It reuses the
// Table Storage the project already pays for: one RateLimits row per (IP, time
// bucket), incremented on each submission.

// 10-minute windows. Matches the doc's example ("5 submissions per IP per 10
// minutes"). The window is derived from wall-clock time, not per-IP state, so a
// bucket rolls over for everyone at the same instants — no per-IP reset timers.
const BUCKET_MS = 10 * 60 * 1000

// Reject once an IP exceeds this many submissions within a single bucket. The
// doc's example value: generous for a real player replaying a handful of runs,
// restrictive for a script. Threshold is "more than MAX", i.e. the (MAX+1)th
// submission in a window is the first to be rejected.
export const RATE_LIMIT_MAX = 5

// Fixed key used when x-forwarded-for is absent — notably local `func start`,
// which has no SWA/Front Door proxy in front of it to populate the header. In
// production the real header always takes priority (see getClientIp). All
// header-less callers share this one bucket, which is fine locally.
const LOCAL_DEV_IP = 'local-dev'

// x-forwarded-for is attacker-controlled free-text, and clientIp becomes a Table
// Storage PartitionKey, so restrict it to the characters an IPv4/IPv6 address
// can contain. This both prevents key-injection / invalid-key errors and bounds
// its length. Anything outside the set is dropped.
function sanitizeIp(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-fA-F:.]/g, '')
  return cleaned.length > 0 ? cleaned : LOCAL_DEV_IP
}

// x-forwarded-for is "client, proxy1, proxy2, ..."; the leftmost entry is the
// original client (the value SWA/Front Door populates in production). This is
// spoofable by a client sending its own header, but that's equivalent to the
// rotating-IP case the doc already accepts as out of scope for this limiter.
export function getClientIp(request: HttpRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (!forwardedFor) {
    return LOCAL_DEV_IP
  }
  const [first] = forwardedFor.split(',')
  return sanitizeIp(first.trim())
}

export function getTimeBucket(now: number = Date.now()): string {
  return String(Math.floor(now / BUCKET_MS))
}

interface RateLimitEntity {
  partitionKey: string
  rowKey: string
  Count: number
}

export interface RateLimitResult {
  clientIp: string
  bucket: string
  count: number
  limited: boolean
}

async function readCount(
  client: ReturnType<typeof getRateLimitsTableClient>,
  clientIp: string,
  bucket: string,
): Promise<number> {
  try {
    const entity = await client.getEntity<RateLimitEntity>(clientIp, bucket)
    return typeof entity.Count === 'number' ? entity.Count : 0
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      return 0
    }
    throw err
  }
}

// Increment this IP's counter for the current time bucket and report whether it
// is now over the limit. The increment happens on every call regardless of
// whether the caller is ultimately accepted or rejected downstream, so a script
// hammering right at the threshold can't dodge being counted.
//
// Race note: this is a plain read-modify-upsert with no optimistic-concurrency
// (ETag) retry, so two concurrent requests from the same IP in the same bucket
// can both read count N and both write N+1 — a lost update that slightly
// under-counts. Accepted for this project's scale (a hobby beerfest game): the
// only effect is a spammer occasionally getting one or two extra submissions
// through under a burst, not a correctness or security hole worth ETag retries.
export async function incrementAndCheckRateLimit(
  request: HttpRequest,
): Promise<RateLimitResult> {
  const clientIp = getClientIp(request)
  const bucket = getTimeBucket()

  await ensureTablesReady()
  const client = getRateLimitsTableClient()

  const previous = await readCount(client, clientIp, bucket)
  const count = previous + 1

  await client.upsertEntity<RateLimitEntity>(
    { partitionKey: clientIp, rowKey: bucket, Count: count },
    'Merge',
  )

  return { clientIp, bucket, count, limited: count > RATE_LIMIT_MAX }
}
