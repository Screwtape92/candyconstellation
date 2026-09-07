import { useLeaderboard } from '../api-client/useLeaderboard'
import { LeaderboardTable } from '../site/LeaderboardTable'
import { PlayButton } from '../site/ui'

interface LeaderboardProps {
  onPlayAgain: () => void
  onBackToHome: () => void
}

// Full-screen leaderboard, reached after a post-game submission (docs/game-
// design.md state machine). The same LeaderboardTable the landing page's inline
// board section uses, at the full top-100 depth rather than the page's
// front-page-of-ten slice.
export function Leaderboard({ onPlayAgain, onBackToHome }: LeaderboardProps) {
  const { entries, staleRefresh } = useLeaderboard()

  return (
    <div className="flex h-full w-full flex-col items-center gap-6 overflow-y-auto p-6 text-center">
      <h1 className="font-display text-4xl font-extrabold text-taffy">
        Leaderboard
      </h1>

      <div className="w-full max-w-lg text-left">
        <LeaderboardTable entries={entries} staleRefresh={staleRefresh} />
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
