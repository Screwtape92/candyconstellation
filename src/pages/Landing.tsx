interface LandingProps {
  onPlay: () => void
  onViewLeaderboard: () => void
}

// Pre-game screen (docs/game-design.md state machine: React "Landing" -> Phaser
// BootScene). Minimal and Tailwind-styled to match the placeholder visual level
// of the rest of the project — real visual polish is a later phase.
export function Landing({ onPlay, onViewLeaderboard }: LandingProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center text-white">
      <div>
        <h1 className="text-5xl font-bold tracking-tight">
          Candy Constellation
        </h1>
        <p className="mt-2 text-xl text-slate-400">Space Dodger</p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onPlay}
          className="rounded-lg bg-indigo-600 px-10 py-3 text-2xl font-semibold hover:bg-indigo-500"
        >
          Play
        </button>
        <button
          type="button"
          onClick={onViewLeaderboard}
          className="text-lg text-slate-300 underline hover:text-white"
        >
          Leaderboard
        </button>
      </div>
    </div>
  )
}
