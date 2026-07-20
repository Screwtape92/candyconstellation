// localStorage-backed retry queue for score submissions (docs/architecture.md
// "Score-submission resilience"): "Pending submissions are queued in
// localStorage keyed by the same client-generated submissionGuid used in the
// Scores table RowKey, and retried with backoff on next load or on an interval."
//
// The backend makes retries safe: because submissionGuid is reused across
// retries, a retried insert of an already-persisted score collides on the
// RowKey and the backend returns 200 rather than an error (api/submitScore).
// So this queue needs no duplicate detection of its own — it just keeps
// retrying an entry until submitScore resolves without throwing, then drops it.

import { submitScore, type ScoreSubmission } from './submitScore'

const STORAGE_KEY = 'candyConstellation.pendingSubmissions'

// Fixed retry interval. The doc calls for "backoff on ... an interval" without
// requiring true exponential backoff; a steady 30s poll is frequent enough to
// recover quickly once a flaky connection returns, without hammering the
// network while a client stays offline. TUNABLE — playtest, not final.
export const RETRY_INTERVAL_MS = 30_000

// The queue is a map of submissionGuid -> ScoreSubmission so an enqueue for an
// already-queued guid overwrites rather than duplicating.
type PendingMap = Record<string, ScoreSubmission>

function readQueue(): PendingMap {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed !== null && typeof parsed === 'object') {
      return parsed as PendingMap
    }
  } catch {
    // Corrupt/unparseable payload: discard it rather than wedging every drain.
  }
  return {}
}

function writeQueue(queue: PendingMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function enqueue(submission: ScoreSubmission): void {
  const queue = readQueue()
  queue[submission.submissionGuid] = submission
  writeQueue(queue)
}

// Re-read before deleting so an enqueue that lands mid-drain (a fresh failed
// submission arriving while an earlier one is still in flight) isn't clobbered
// by a stale write.
function remove(submissionGuid: string): void {
  const queue = readQueue()
  Reflect.deleteProperty(queue, submissionGuid)
  writeQueue(queue)
}

// Attempt every currently-queued submission. Entries are independent, so they
// run concurrently rather than blocking one another; each success removes its
// own entry and each failure leaves its entry for the next drain.
export async function drainQueue(): Promise<void> {
  const queue = readQueue()
  const submissions = Object.values(queue)
  if (submissions.length === 0) return

  await Promise.allSettled(
    submissions.map(async (submission) => {
      await submitScore(submission)
      remove(submission.submissionGuid)
    }),
  )
}
