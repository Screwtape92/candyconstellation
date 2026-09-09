// Periodic progress reports during a run (docs/game-design.md "Live progress
// verification") — the server builds its own checkpoint of candyPoints/
// killPoints as the run actually happens, rather than trusting only the one
// report submitScore gets at the very end. Fire-and-forget, same resilience
// principle as every other API call here (docs/architecture.md "Score-
// submission resilience"): a dropped report never interrupts gameplay, it
// just means this run's final submission may later fail its freshness/match
// check against the server's checkpoint.

// TUNABLE — how often PlayScene reports while a run is active. Matched by
// MAX_REPORT_GAP_SEC's generous slack in api/shared/liveProgress.ts (12s, 4x
// this) so ordinary jitter/a missed beat never flags an honest run.
export const REPORT_INTERVAL_MS = 3000

export async function reportProgress(
  runToken: string,
  candyPoints: number,
  killPoints: number,
): Promise<void> {
  try {
    await fetch('/api/reportProgress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runToken, candyPoints, killPoints }),
    })
  } catch {
    // Best-effort only — see file comment above.
  }
}
