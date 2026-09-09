import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions'
import { RestError } from '@azure/data-tables'
import {
  ensureTablesReady,
  getScoresTableClient,
} from '../shared/tableStorageClient'
import { validateSubmission } from '../shared/inputValidation'
import { isPlausibleScore } from '../shared/antiCheat'
import { isValidRunDuration } from '../shared/runToken'
import {
  isConsistentScore,
  isValidCandyPoints,
  isValidKillPoints,
} from '../shared/scoreDecomposition'
import { buildRowKey } from '../shared/scoreKey'
import { incrementAndCheckRateLimit } from '../shared/rateLimit'
import { consumeRunToken } from '../shared/runTokenStore'
import { getRunTokensTableClient } from '../shared/tableStorageClient'

const SCORES_PARTITION_KEY = 'score'

export async function submitScore(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Request body must be valid JSON.' },
    }
  }

  const validation = validateSubmission(body)
  if (!validation.ok) {
    return { status: 400, jsonBody: { error: validation.error } }
  }
  const {
    name,
    score,
    elapsedSec,
    submissionGuid,
    runToken,
    candyPoints,
    killPoints,
  } = validation.value

  // Per-IP rate limit (docs/architecture.md "Rate-limiting"): increment the
  // caller's bucket and reject before the anti-cheat check or the Scores write.
  // The increment happens regardless of the outcome, so a script hammering at
  // the threshold can't dodge being counted by triggering a downstream reject.
  try {
    const rateLimit = await incrementAndCheckRateLimit(request)
    if (rateLimit.limited) {
      return {
        status: 429,
        jsonBody: {
          error: 'Too many submissions. Please wait a few minutes and retry.',
        },
      }
    }
  } catch (err) {
    context.error('submitScore rate-limit check failed', err)
    return {
      status: 500,
      jsonBody: { error: 'Failed to record score. Please retry.' },
    }
  }

  // Run-token verification (docs/game-design.md "Run token verification"):
  // consumeRunToken is single-use, so a missing/unknown/already-used token is
  // rejected here before isValidRunDuration even runs. Same rejection message
  // as the plausibility check below — both boil down to "this claimed run
  // isn't credible" and there's no benefit to an attacker in distinguishing
  // which specific check caught it.
  try {
    await ensureTablesReady()
    const consumed = await consumeRunToken(getRunTokensTableClient(), runToken)
    if (!consumed || !isValidRunDuration(elapsedSec, consumed.issuedAtUtc)) {
      return {
        status: 422,
        jsonBody: {
          error: 'Score is not plausible for the reported run length.',
        },
      }
    }
  } catch (err) {
    context.error('submitScore run-token check failed', err)
    return {
      status: 500,
      jsonBody: { error: 'Failed to record score. Please retry.' },
    }
  }

  // Score decomposition check (docs/game-design.md "Score decomposition
  // check"): the total must be exactly reconstructible from a real
  // survival/candy/kill breakdown, not merely under the ratio ceiling below —
  // a fabricated total can only satisfy this by reverse-engineering the
  // game's actual scoring rules, not by picking anything plausible-looking.
  if (
    !isValidCandyPoints(candyPoints) ||
    !isValidKillPoints(killPoints) ||
    !isConsistentScore(score, elapsedSec, candyPoints, killPoints)
  ) {
    return {
      status: 422,
      jsonBody: {
        error: 'Score is not plausible for the reported run length.',
      },
    }
  }

  if (!isPlausibleScore(score, elapsedSec)) {
    return {
      status: 422,
      jsonBody: {
        error: 'Score is not plausible for the reported run length.',
      },
    }
  }

  const entity = {
    partitionKey: SCORES_PARTITION_KEY,
    rowKey: buildRowKey(score, submissionGuid),
    PlayerName: name,
    Score: score,
    ElapsedSec: elapsedSec,
    AchievedAtUtc: new Date().toISOString(),
  }

  try {
    await ensureTablesReady()
    await getScoresTableClient().createEntity(entity)
  } catch (err) {
    // Retry safety (docs/architecture.md "Table Storage schema"): the client
    // reuses submissionGuid across retries, so a retried insert of an
    // already-succeeded submission collides on the same RowKey. Table Storage
    // rejects that with 409 Conflict (RestError.statusCode === 409); treat it as
    // success so the client's retry queue clears instead of retrying forever.
    if (err instanceof RestError && err.statusCode === 409) {
      return { status: 200, jsonBody: { ok: true, duplicate: true } }
    }
    context.error('submitScore failed to persist entity', err)
    return {
      status: 500,
      jsonBody: { error: 'Failed to record score. Please retry.' },
    }
  }

  return { status: 201, jsonBody: { ok: true } }
}

app.http('submitScore', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'submitScore',
  handler: submitScore,
})
