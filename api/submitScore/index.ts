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
import { buildRowKey } from '../shared/scoreKey'

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
  const { name, score, elapsedSec, submissionGuid } = validation.value

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
