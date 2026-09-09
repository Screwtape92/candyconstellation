import { randomUUID } from 'node:crypto'
import { RestError, type TableEntityResult } from '@azure/data-tables'
import { getRunTokensTableClient } from './tableStorageClient'

// Table Storage-backed run-token store (docs/game-design.md "Run token
// verification") — mirrors server/runTokens.ts's SQLite version. PartitionKey
// is the token itself (each token is its own point lookup, not queried as a
// set), RowKey a fixed constant.

const ROW_KEY = 'token'

interface RunTokenEntity {
  partitionKey: string
  rowKey: string
  IssuedAtUtc: string
  Consumed: boolean
}

export interface IssuedRunToken {
  token: string
  issuedAtUtc: string
}

export async function issueRunToken(
  client: ReturnType<typeof getRunTokensTableClient>,
): Promise<IssuedRunToken> {
  const token = randomUUID()
  const issuedAtUtc = new Date().toISOString()
  await client.createEntity<RunTokenEntity>({
    partitionKey: token,
    rowKey: ROW_KEY,
    IssuedAtUtc: issuedAtUtc,
    Consumed: false,
  })
  return { token, issuedAtUtc }
}

// Single-use via an ETag-conditional update: updateEntity('Merge', ifMatch)
// only succeeds if the entity hasn't changed since this read, so two
// concurrent consume attempts for the same token can't both succeed — unlike
// the rate-limit counter (api/shared/rateLimit.ts), a lost update here would
// be a real security hole (replaying one token as two valid submissions), not
// just an off-by-a-couple-of-requests undercount, so the accepted-race
// tradeoff that file documents doesn't apply here.
export async function consumeRunToken(
  client: ReturnType<typeof getRunTokensTableClient>,
  token: string,
): Promise<{ issuedAtUtc: string } | null> {
  let entity: TableEntityResult<RunTokenEntity>
  try {
    entity = await client.getEntity<RunTokenEntity>(token, ROW_KEY)
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      return null
    }
    throw err
  }
  if (entity.Consumed) {
    return null
  }

  try {
    await client.updateEntity<RunTokenEntity>(
      {
        partitionKey: token,
        rowKey: ROW_KEY,
        IssuedAtUtc: entity.IssuedAtUtc,
        Consumed: true,
      },
      'Merge',
      { etag: entity.etag },
    )
  } catch (err) {
    // Lost the race to a concurrent consume of the same token (precondition
    // failed on the ETag) — treat exactly like already-consumed.
    if (err instanceof RestError && err.statusCode === 412) {
      return null
    }
    throw err
  }

  return { issuedAtUtc: entity.IssuedAtUtc }
}

// No scheduled cleanup job exists in this project (see server/runTokens.ts's
// opportunistic-sweep-on-issue for the SQLite side's equivalent) — Table
// Storage has no cheap "delete where older than" primitive the way a single
// SQL statement does, and this table's growth is bounded by the same
// generous ceiling (RUN_TOKEN_MAX_AGE_SEC, runToken.ts) that also bounds
// token validity, so stale rows are harmless, just not actively pruned.
// Revisit if storage volume ever becomes a genuine concern
// (docs/architecture.md's Scores table already accepts the same
// unbounded-growth tradeoff, at a similar cost).
