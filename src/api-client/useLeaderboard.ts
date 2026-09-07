import { useEffect, useState } from 'react'

import { getLeaderboard, type LeaderboardEntry } from './getLeaderboard'

// Poll interval for refetching the leaderboard (docs/architecture.md
// "Leaderboard refresh": "polls getLeaderboard on a simple interval (5-10s)").
// TUNABLE — playtest, not final.
const POLL_INTERVAL_MS = 7_000

/**
 * Live leaderboard data. Shared by the landing page's board section and the
 * standalone post-submission screen, so the two can never drift into polling
 * on different intervals or handling a failed refresh differently.
 *
 * `entries` is null until the first response lands. A failed poll keeps the
 * last-known-good data on screen and flags `staleRefresh` rather than blanking
 * the list — a network hiccup shouldn't wipe the board mid-party.
 */
export function useLeaderboard(top?: number) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [staleRefresh, setStaleRefresh] = useState(false)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      try {
        const latest = await getLeaderboard(top)
        if (cancelled) return
        setEntries(latest)
        setStaleRefresh(false)
      } catch (err) {
        console.error('getLeaderboard failed', err)
        if (cancelled) return
        setStaleRefresh(true)
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [top])

  return { entries, staleRefresh }
}
