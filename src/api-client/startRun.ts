// Requests a run token the moment a run actually starts (docs/game-design.md
// "Run token verification") — called from PlayScene.create(), well before
// there's a score to submit. submitScore requires this token and the server
// checks the claimed elapsedSec against real time elapsed since it was
// issued, so a fabricated-but-plausible-looking submission can no longer
// claim more play time than has actually passed.
//
// Same-origin `/api/startRun`, no environment-specific base URL, same as
// submitScore/getLeaderboard.

export async function startRun(): Promise<string | null> {
  try {
    const response = await fetch('/api/startRun', { method: 'POST' })
    if (!response.ok) {
      return null
    }
    const body = (await response.json()) as { token: string }
    return body.token
  } catch {
    // Network hiccup at run start — returning null here rather than
    // throwing lets PlayScene start the run regardless (starting a run must
    // never block on this, same "never block gameplay" principle as
    // docs/architecture.md "Score-submission resilience"). A run with no
    // token still can't be verified server-side, which submitScore will
    // reject — an accepted, extremely rare edge case rather than something
    // worth retrying mid-run for.
    return null
  }
}
