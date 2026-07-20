interface LeaderboardProps {
  onBack: () => void
}

// Leaderboard screen (docs/game-design.md state machine). Reachable from Landing
// and after post-game submission. This is a placeholder shell — real
// data fetching + interval polling of getLeaderboard is Phase 6.4
// (docs/architecture.md "Leaderboard refresh"). For now it only wires the
// page-to-page navigation so the full flow is testable end-to-end.
export function Leaderboard({ onBack }: LeaderboardProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center text-white">
      <h1 className="text-4xl font-bold">Leaderboard</h1>
      <p className="text-lg text-slate-400">Scores coming soon.</p>
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
