import { TableClient, TableServiceClient } from '@azure/data-tables'

export const SCORES_TABLE = 'Scores'
export const RATE_LIMITS_TABLE = 'RateLimits'

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

export async function ensureTablesExist(): Promise<void> {
  const service = TableServiceClient.fromConnectionString(
    connectionString,
    clientOptions,
  )
  await service.createTable(SCORES_TABLE)
  await service.createTable(RATE_LIMITS_TABLE)
}
