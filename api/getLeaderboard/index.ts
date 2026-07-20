import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions'
import {
  ensureTablesReady,
  getScoresTableClient,
} from '../shared/tableStorageClient'

const SCORES_PARTITION_KEY = 'score'

// Top-N handling: default when no ?top is given, and a hard ceiling so a client
// can't request an absurdly large page. The RowKey encoding means the query only
// ever reads from the head of the partition (docs/architecture.md "Table Storage
// schema"), so the cap bounds a single request's cost, not a full-partition scan.
const DEFAULT_TOP = 20
const MAX_TOP = 100

interface ScoreEntity {
  PlayerName: string
  Score: number
  ElapsedSec: number
  AchievedAtUtc: string
}

interface LeaderboardEntry {
  playerName: string
  score: number
  elapsedSec: number
  achievedAtUtc: string
}

function resolveTop(raw: string | null): number {
  if (raw === null) {
    return DEFAULT_TOP
  }
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_TOP
  }
  return Math.min(parsed, MAX_TOP)
}

export async function getLeaderboard(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const top = resolveTop(request.query.get('top'))

  try {
    await ensureTablesReady()

    // Table Storage returns entities within a partition in ascending RowKey
    // order, and RowKey embeds the inverted score, so ascending key order is
    // already descending score order (docs/architecture.md "Table Storage
    // schema"). byPage({ maxPageSize: top }) maps to the service-side $top, so
    // only the first `top` rows are fetched off the head of the key range — no
    // full-partition read and no in-memory sort. We take just the first page
    // and never advance the iterator.
    const pages = getScoresTableClient()
      .listEntities<ScoreEntity>({
        queryOptions: {
          filter: `PartitionKey eq '${SCORES_PARTITION_KEY}'`,
          select: ['PlayerName', 'Score', 'ElapsedSec', 'AchievedAtUtc'],
        },
      })
      .byPage({ maxPageSize: top })

    const firstPage = await pages.next()
    const rows: ScoreEntity[] = firstPage.done ? [] : firstPage.value

    const entries: LeaderboardEntry[] = rows.map((row) => ({
      playerName: row.PlayerName,
      score: row.Score,
      elapsedSec: row.ElapsedSec,
      achievedAtUtc: row.AchievedAtUtc,
    }))

    return { status: 200, jsonBody: { entries } }
  } catch (err) {
    context.error('getLeaderboard failed to read scores', err)
    return {
      status: 500,
      jsonBody: { error: 'Failed to load leaderboard. Please retry.' },
    }
  }
}

app.http('getLeaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getLeaderboard',
  handler: getLeaderboard,
})
