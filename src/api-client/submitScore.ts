// Fire-and-forget POST to the backend submitScore endpoint (docs/architecture.md
// "Score-submission resilience": the call is fired in the background and the UI
// proceeds optimistically without awaiting it). This wrapper is a normal async
// function that resolves on a persisted submission and rejects on failure — the
// caller simply chooses not to block on it. The localStorage retry queue that
// makes rejections recoverable is Phase 6.3, not here.
//
// The request path is same-origin `/api/submitScore`: in dev, Vite proxies it to
// the local Functions runtime; in production, Azure Static Web Apps natively
// proxies `/api/*` to its linked Functions app — so no environment-specific base
// URL is needed.

export interface ScoreSubmission {
  name: string
  score: number
  elapsedSec: number
  submissionGuid: string
}

export async function submitScore(submission: ScoreSubmission): Promise<void> {
  const response = await fetch('/api/submitScore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })

  if (!response.ok) {
    throw new Error(`submitScore failed with status ${response.status}`)
  }
}
