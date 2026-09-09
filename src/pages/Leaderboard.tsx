import { useLeaderboard } from '../api-client/useLeaderboard'
import type { LeaderboardEntry } from '../api-client/getLeaderboard'
import { LeaderboardTable } from '../site/LeaderboardTable'
import { PlayButton } from '../site/ui'

interface LeaderboardProps {
  justSubmitted: LeaderboardEntry | null
  onPlayAgain: () => void
  onBackToHome: () => void
}

// getLeaderboard's own response has no reliable identifier to match a row
// back to a specific submission (no submissionGuid in LeaderboardEntry), so
// this is the best available equality check for "is this the row I just
// submitted" — good enough odds of a false match are negligible for a
// leaderboard, and a false positive only costs a slightly-wrong highlight.
function isSameEntry(a: LeaderboardEntry, b: LeaderboardEntry) {
  return (
    a.playerName === b.playerName &&
    a.score === b.score &&
    a.elapsedSec === b.elapsedSec
  )
}

// Merges the just-submitted run into the fetched entries so it's visible the
// instant this page renders, rather than depending on winning its race against
// getLeaderboard's own fetch (see PostGame.tsx) or waiting for the next poll.
// Once the server's copy shows up in a later poll, it satisfies isSameEntry
// and the optimistic row is skipped rather than duplicated.
function mergeJustSubmitted(
  entries: LeaderboardEntry[] | null,
  justSubmitted: LeaderboardEntry | null,
): { entries: LeaderboardEntry[] | null; highlightIndex?: number } {
  if (entries === null || justSubmitted === null) return { entries }

  const existingIndex = entries.findIndex((entry) =>
    isSameEntry(entry, justSubmitted),
  )
  if (existingIndex !== -1) return { entries, highlightIndex: existingIndex }

  const merged = [...entries]
  let insertAt = merged.findIndex((entry) => entry.score < justSubmitted.score)
  if (insertAt === -1) insertAt = merged.length
  merged.splice(insertAt, 0, justSubmitted)
  return { entries: merged, highlightIndex: insertAt }
}

// Full-screen leaderboard, reached after a post-game submission (docs/game-
// design.md state machine). The same LeaderboardTable the landing page's inline
// board section uses, at the full top-100 depth rather than the page's
// front-page-of-ten slice.
export function Leaderboard({
  justSubmitted,
  onPlayAgain,
  onBackToHome,
}: LeaderboardProps) {
  const { entries, staleRefresh } = useLeaderboard()
  const merged = mergeJustSubmitted(entries, justSubmitted)

  return (
    <div className="flex h-full w-full flex-col items-center gap-6 overflow-y-auto p-6 text-center">
      <h1 className="font-display text-4xl font-extrabold text-taffy">
        Leaderboard
      </h1>

      <div className="w-full max-w-2xl text-left">
        <LeaderboardTable
          entries={merged.entries}
          staleRefresh={staleRefresh}
          highlightIndex={merged.highlightIndex}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <PlayButton onClick={onPlayAgain}>Play again</PlayButton>
        <PlayButton onClick={onBackToHome} variant="ghost">
          Back to home page
        </PlayButton>
      </div>
    </div>
  )
}
