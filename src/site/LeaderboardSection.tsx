import { useLeaderboard } from '../api-client/useLeaderboard'
import { LeaderboardTable } from './LeaderboardTable'
import { SectionHeading } from './ui'

// How many rows the landing page shows. The endpoint serves the full top 100;
// a page section wants the part people actually read.
const VISIBLE_ROWS = 10

export function LeaderboardSection() {
  const { entries, staleRefresh } = useLeaderboard(VISIBLE_ROWS)

  return (
    <section
      id="board"
      className="mx-auto max-w-[1160px] border-t border-rim px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(3.5rem,8vw,5.75rem)]"
    >
      <SectionHeading
        eyebrow="Standings"
        title="The leaderboard"
        lede="No accounts — type whatever name you like when your run ends. It updates itself while you watch."
      />

      <LeaderboardTable entries={entries} staleRefresh={staleRefresh} />

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-xs text-dim">
        <span className="before:mr-2 before:inline-block before:h-1.5 before:w-1.5 before:animate-pulse before:rounded-full before:bg-sky-candy before:align-[1px] before:content-['']">
          Live — refreshes on its own
        </span>
        <span>
          Lost your connection mid-submit? The score queues and sends itself
          later.
        </span>
      </div>
    </section>
  )
}
