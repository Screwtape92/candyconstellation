import { TableClient, TableServiceClient } from '@azure/data-tables'

export const SCORES_TABLE = 'Scores'
export const RATE_LIMITS_TABLE = 'RateLimits'
// Run-token verification (docs/game-design.md "Run token verification",
// added 2026-09-09) — separate table/bucket from RATE_LIMITS_TABLE above so
// replaying several runs in a row never throttles token issuance before any
// of those runs even reach submission.
export const RUN_TOKENS_TABLE = 'RunTokens'
export const RUN_TOKEN_RATE_LIMITS_TABLE = 'RunTokenRateLimits'
// Live progress verification (docs/game-design.md "Live progress
// verification", added 2026-09-09) — reports every few seconds for a run's
// entire duration, far more frequent than starting a run or submitting a
// score, so this needs its own, much more generous rate-limit bucket.
export const REPORT_PROGRESS_RATE_LIMITS_TABLE = 'ReportProgressRateLimits'

const connectionString =
  process.env.AzureWebJobsStorage ?? 'UseDevelopmentStorage=true'

// Azurite serves the Table endpoint over plain HTTP, which the SDK rejects
// unless insecure connections are explicitly allowed.
const clientOptions = { allowInsecureConnection: true }

export function getTableClient(tableName: string): TableClient {
  return TableClient.fromConnectionString(
    connectionString,
    tableName,
    clientOptions,
  )
}

export function getScoresTableClient(): TableClient {
  return getTableClient(SCORES_TABLE)
}

export function getRateLimitsTableClient(): TableClient {
  return getTableClient(RATE_LIMITS_TABLE)
}

export function getRunTokensTableClient(): TableClient {
  return getTableClient(RUN_TOKENS_TABLE)
}

export function getRunTokenRateLimitsTableClient(): TableClient {
  return getTableClient(RUN_TOKEN_RATE_LIMITS_TABLE)
}

export function getReportProgressRateLimitsTableClient(): TableClient {
  return getTableClient(REPORT_PROGRESS_RATE_LIMITS_TABLE)
}

export async function ensureTablesExist(): Promise<void> {
  const service = TableServiceClient.fromConnectionString(
    connectionString,
    clientOptions,
  )
  await service.createTable(SCORES_TABLE)
  await service.createTable(RATE_LIMITS_TABLE)
  await service.createTable(RUN_TOKENS_TABLE)
  await service.createTable(RUN_TOKEN_RATE_LIMITS_TABLE)
  await service.createTable(REPORT_PROGRESS_RATE_LIMITS_TABLE)
}

// Cache the table-creation so it runs at most once per process (cold start)
// rather than on every request. createTable is idempotent (it swallows
// TableAlreadyExists), so this only guards against the extra round-trips, not
// correctness. Reset to undefined on failure so a transient error can be retried
// on the next request instead of being permanently cached.
let tablesReady: Promise<void> | undefined

export function ensureTablesReady(): Promise<void> {
  tablesReady ??= ensureTablesExist().catch((err) => {
    tablesReady = undefined
    throw err
  })
  return tablesReady
}
