import type { LeaderboardEntry } from '../api-client/getLeaderboard'

// PlayerName is untrusted free-text (no auth — docs/architecture.md "Input
// validation"). It's rendered as plain JSX text content, so React HTML-escapes
// it; nothing here uses dangerouslySetInnerHTML or any raw-HTML insertion, so a
// submitted name can't inject markup.

// Medal colours for the top three, dimmed grey for everyone else.
const RANK_COLOURS = ['text-gold', 'text-sky-candy', 'text-bubblegum']

function formatDuration(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

export function LeaderboardTable({
  entries,
  staleRefresh,
  caption,
  highlightIndex,
}: {
  entries: LeaderboardEntry[] | null
  staleRefresh?: boolean
  caption?: string
  highlightIndex?: number
}) {
  if (entries === null) {
    // A failed *first* load is a different state from "still loading" — without
    // this branch, a backend that's down forever reads as a spinner that never
    // resolves, with nothing telling the player why.
    return (
      <p className="p-6 text-center font-light text-dim">
        {staleRefresh ? "Couldn't load the leaderboard." : 'Loading…'}
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="p-6 text-center font-light text-dim">
        No scores yet — be the first.
      </p>
    )
  }

  return (
    <>
      {staleRefresh && (
        <p className="mb-3 font-mono text-xs text-gold">
          Couldn&rsquo;t refresh — showing the last results.
        </p>
      )}
      <div className="overflow-x-auto border-2 border-rim">
        <table className="w-full min-w-[480px] table-fixed border-collapse">
          {caption && (
            <caption className="border-b border-rim bg-panel-hi px-6 py-3 text-left font-mono text-[0.6875rem] tracking-[0.16em] text-dim">
              {caption}
            </caption>
          )}
          <thead>
            <tr className="[&>th]:border-b [&>th]:border-rim [&>th]:px-6 [&>th]:py-3 [&>th]:font-mono [&>th]:text-[0.6875rem] [&>th]:font-normal [&>th]:tracking-[0.14em] [&>th]:text-dim">
              <th scope="col" className="w-18 text-left">
                #
              </th>
              <th scope="col" className="w-full text-left">
                Name
              </th>
              <th scope="col" className="w-28 text-right">
                Survived
              </th>
              <th scope="col" className="w-24 text-right">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.achievedAtUtc}-${index}`}
                className={`border-b border-rim last:border-b-0 ${
                  index === highlightIndex
                    ? 'bg-[color-mix(in_srgb,var(--color-bubblegum)_14%,var(--color-panel))]'
                    : 'bg-panel'
                }`}
              >
                <td
                  className={`px-6 py-3 font-mono font-bold ${
                    RANK_COLOURS[index] ?? 'text-dim'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="truncate px-6 py-3 font-bold text-cream">
                  {entry.playerName}
                </td>
                <td className="px-6 py-3 text-right font-mono tabular-nums text-dim">
                  {formatDuration(entry.elapsedSec)}
                </td>
                <td className="px-6 py-3 text-right font-mono font-bold tabular-nums text-cream">
                  {entry.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
