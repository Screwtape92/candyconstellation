import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions'
import {
  ensureTablesReady,
  getRunTokensTableClient,
} from '../shared/tableStorageClient'
import { incrementAndCheckRunTokenRateLimit } from '../shared/rateLimit'
import { issueRunToken } from '../shared/runTokenStore'

// Issues a run token the moment a run actually starts (docs/game-design.md
// "Run token verification") — called by the client from PlayScene.create(),
// well before there's anything to submit. See server/api.ts's handleStartRun
// for the self-hosted equivalent.
export async function startRun(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const rateLimit = await incrementAndCheckRunTokenRateLimit(request)
    if (rateLimit.limited) {
      return {
        status: 429,
        jsonBody: {
          error: 'Too many run starts. Please wait a few minutes and retry.',
        },
      }
    }

    await ensureTablesReady()
    const issued = await issueRunToken(getRunTokensTableClient())
    return { status: 201, jsonBody: issued }
  } catch (err) {
    context.error('startRun failed to issue token', err)
    return {
      status: 500,
      jsonBody: { error: 'Failed to start run. Please retry.' },
    }
  }
}

app.http('startRun', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'startRun',
  handler: startRun,
})
