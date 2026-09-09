import { randomUUID } from 'node:crypto'
import { RestError, type TableEntityResult } from '@azure/data-tables'
import { getRunTokensTableClient } from './tableStorageClient'
import { isValidProgressReport } from './liveProgress'

// Table Storage-backed run-token store (docs/game-design.md "Run token
// verification" / "Live progress verification") — mirrors server/runTokens.ts's
// SQLite version. PartitionKey is the token itself (each token is its own
// point lookup, not queried as a set), RowKey a fixed constant.

const ROW_KEY = 'token'

interface RunTokenEntity {
  partitionKey: string
  rowKey: string
  IssuedAtUtc: string
  Consumed: boolean
  LastReportAtUtc?: string
  LastCandyPoints: number
  LastKillPoints: number
  Flagged: boolean
}

export interface IssuedRunToken {
  token: string
  issuedAtUtc: string
}

export interface ConsumedRunToken {
  issuedAtUtc: string
  lastReportAtUtc: string | null
  lastCandyPoints: number
  lastKillPoints: number
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
    LastCandyPoints: 0,
    LastKillPoints: 0,
    Flagged: false,
  })
  return { token, issuedAtUtc }
}

// Single-use via an ETag-conditional update: updateEntity('Merge', ifMatch)
// only succeeds if the entity hasn't changed since this read, so two
// concurrent consume attempts for the same token can't both succeed — unlike
// the rate-limit counter (api/shared/rateLimit.ts), a lost update here would
// be a real security hole (replaying one token as two valid submissions), not
// just an off-by-a-couple-of-requests undercount, so the accepted-race
// tradeoff that file documents doesn't apply here. A flagged token (set the
// moment any single progress report failed validation, see recordProgress
// below) is rejected here too, even though it may never have been formally
// "consumed".
export async function consumeRunToken(
  client: ReturnType<typeof getRunTokensTableClient>,
  token: string,
): Promise<ConsumedRunToken | null> {
  let entity: TableEntityResult<RunTokenEntity>
  try {
    entity = await client.getEntity<RunTokenEntity>(token, ROW_KEY)
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      return null
    }
    throw err
  }
  if (entity.Consumed || entity.Flagged) {
    return null
  }

  try {
    await client.updateEntity<RunTokenEntity>(
      {
        partitionKey: token,
        rowKey: ROW_KEY,
        IssuedAtUtc: entity.IssuedAtUtc,
        Consumed: true,
        LastCandyPoints: entity.LastCandyPoints,
        LastKillPoints: entity.LastKillPoints,
        Flagged: entity.Flagged,
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

  return {
    issuedAtUtc: entity.IssuedAtUtc,
    lastReportAtUtc: entity.LastReportAtUtc ?? null,
    lastCandyPoints: entity.LastCandyPoints,
    lastKillPoints: entity.LastKillPoints,
  }
}

export type RecordProgressResult = 'ok' | 'invalid'

// Validates and records one /api/reportProgress call against the token's own
// last checkpoint (docs/game-design.md "Live progress verification"). Any
// failure permanently flags the token via the same ETag-conditional update
// used for consumeRunToken above — a token that once produced an implausible
// jump doesn't get another chance to look fine later.
export async function recordProgress(
  client: ReturnType<typeof getRunTokensTableClient>,
  token: string,
  candyPoints: number,
  killPoints: number,
  now: Date = new Date(),
): Promise<RecordProgressResult> {
  let entity: TableEntityResult<RunTokenEntity>
  try {
    entity = await client.getEntity<RunTokenEntity>(token, ROW_KEY)
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      return 'invalid'
    }
    throw err
  }
  if (entity.Consumed || entity.Flagged) {
    return 'invalid'
  }

  const issuedAtMs = Date.parse(entity.IssuedAtUtc)
  const lastReportMs = entity.LastReportAtUtc
    ? Date.parse(entity.LastReportAtUtc)
    : issuedAtMs
  const elapsedSecSoFar = (now.getTime() - issuedAtMs) / 1000
  const gapSeconds = (now.getTime() - lastReportMs) / 1000

  const valid = isValidProgressReport(
    candyPoints,
    killPoints,
    entity.LastReportAtUtc
      ? { candyPoints: entity.LastCandyPoints, killPoints: entity.LastKillPoints }
      : null,
    elapsedSecSoFar,
    gapSeconds,
  )

  try {
    if (!valid) {
      await client.updateEntity<RunTokenEntity>(
        {
          partitionKey: token,
          rowKey: ROW_KEY,
          IssuedAtUtc: entity.IssuedAtUtc,
          Consumed: entity.Consumed,
          LastCandyPoints: entity.LastCandyPoints,
          LastKillPoints: entity.LastKillPoints,
          Flagged: true,
        },
        'Merge',
        { etag: entity.etag },
      )
      return 'invalid'
    }
    await client.updateEntity<RunTokenEntity>(
      {
        partitionKey: token,
        rowKey: ROW_KEY,
        IssuedAtUtc: entity.IssuedAtUtc,
        Consumed: entity.Consumed,
        LastReportAtUtc: now.toISOString(),
        LastCandyPoints: candyPoints,
        LastKillPoints: killPoints,
        Flagged: entity.Flagged,
      },
      'Merge',
      { etag: entity.etag },
    )
    return 'ok'
  } catch (err) {
    // Lost a race to a concurrent report/consume on the same token —
    // treat like an invalid report rather than silently dropping it.
    if (err instanceof RestError && err.statusCode === 412) {
      return 'invalid'
    }
    throw err
  }
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
