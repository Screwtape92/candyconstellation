// Fetch wrapper for the backend getLeaderboard endpoint (docs/architecture.md
// "Leaderboard refresh"). The Leaderboard page polls this on an interval.
//
// Like submitScore, the request path is same-origin `/api/getLeaderboard`: Vite
// proxies it to the local Functions runtime in dev, and Azure Static Web Apps
// proxies `/api/*` to its linked Functions app in production — so no
// environment-specific base URL is needed.
//
// Entries arrive already sorted descending by score server-side (the RowKey
// encodes sort order — docs/architecture.md "Table Storage schema"), so there's
// no client-side re-sort.

export interface LeaderboardEntry {
  playerName: string
  score: number
  elapsedSec: number
  achievedAtUtc: string
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[]
}

export async function getLeaderboard(
  top?: number,
): Promise<LeaderboardEntry[]> {
  const query = top === undefined ? '' : `?top=${top}`
  const response = await fetch(`/api/getLeaderboard${query}`)

  if (!response.ok) {
    throw new Error(`getLeaderboard failed with status ${response.status}`)
  }

  const body = (await response.json()) as LeaderboardResponse
  return body.entries
}
