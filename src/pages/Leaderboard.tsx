import { useEffect, useState } from 'react'

import {
  getLeaderboard,
  type LeaderboardEntry,
} from '../api-client/getLeaderboard'

interface LeaderboardProps {
  onBack: () => void
}

// Poll interval for refetching the leaderboard (docs/architecture.md
// "Leaderboard refresh": "polls getLeaderboard on a simple interval (5-10s)").
// TUNABLE — playtest, not final.
const POLL_INTERVAL_MS = 7_000

// Leaderboard screen (docs/game-design.md state machine). Reachable from Landing
// and after post-game submission. Fetches on mount, then polls getLeaderboard on
// an interval (docs/architecture.md "Leaderboard refresh").
//
// PlayerName is untrusted free-text (no auth — docs/architecture.md "Input
// validation"). It's rendered here as plain JSX text content, so React
// HTML-escapes it automatically; nothing in this component uses
// dangerouslySetInnerHTML or any raw-HTML insertion, so a submitted name can't
// inject markup/script.
export function Leaderboard({ onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [staleRefresh, setStaleRefresh] = useState(false)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      try {
        const latest = await getLeaderboard()
        if (cancelled) return
        setEntries(latest)
        setStaleRefresh(false)
      } catch (err) {
        // A poll failing (e.g. a network hiccup) keeps the last-known-good data
        // displayed and just flags that the latest refresh didn't land, rather
        // than crashing the page or clearing the list.
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
  }, [])

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center text-white">
      <h1 className="text-4xl font-bold">Leaderboard</h1>

      {staleRefresh && (
        <p className="text-sm text-amber-400">
          Couldn&rsquo;t refresh — showing last results.
        </p>
      )}

      {entries === null ? (
        <p className="text-lg text-slate-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-lg text-slate-400">No scores yet — be the first!</p>
      ) : (
        <ol className="flex w-full flex-col gap-2">
          {entries.map((entry, index) => (
            <li
              key={`${entry.achievedAtUtc}-${index}`}
              className="flex items-center justify-between gap-4 rounded-lg bg-slate-800 px-4 py-2 text-lg"
            >
              <span className="w-8 text-right font-mono text-slate-400">
                {index + 1}
              </span>
              <span className="flex-1 truncate text-left">
                {entry.playerName}
              </span>
              <span className="font-mono font-semibold">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={onBack}
        className="rounded-lg bg-slate-700 px-8 py-3 text-lg font-semibold hover:bg-slate-600"
      >
        Back
      </button>
    </div>
  )
}
