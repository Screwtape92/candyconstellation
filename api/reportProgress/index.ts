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
import { incrementAndCheckReportProgressRateLimit } from '../shared/rateLimit'
import { recordProgress } from '../shared/runTokenStore'
import { isValidCandyPoints, isValidKillPoints } from '../shared/scoreDecomposition'

// Periodic progress checkpoint during a run (docs/game-design.md "Live
// progress verification") — see server/api.ts's handleReportProgress for the
// self-hosted equivalent and the full rationale. Best-effort from the
// client's side (fire-and-forget, src/api-client/reportProgress.ts); a
// failure here doesn't need a detailed error body since nothing reads it —
// it just means this run's final submitScore may later fail its freshness/
// match check.
export async function reportProgress(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { status: 400, jsonBody: { error: 'Request body must be valid JSON.' } }
  }

  if (typeof body !== 'object' || body === null) {
    return { status: 400, jsonBody: { error: 'Request body must be a JSON object.' } }
  }
  const { runToken, candyPoints, killPoints } = body as Record<string, unknown>

  if (typeof runToken !== 'string') {
    return { status: 400, jsonBody: { error: 'runToken must be a string.' } }
  }
  if (typeof candyPoints !== 'number' || !isValidCandyPoints(candyPoints)) {
    return { status: 400, jsonBody: { error: 'candyPoints must be a non-negative integer.' } }
  }
  if (typeof killPoints !== 'number' || !isValidKillPoints(killPoints)) {
    return { status: 400, jsonBody: { error: 'killPoints must be a non-negative integer.' } }
  }

  try {
    const rateLimit = await incrementAndCheckReportProgressRateLimit(request)
    if (rateLimit.limited) {
      return { status: 429, jsonBody: { error: 'Too many progress reports.' } }
    }

    await ensureTablesReady()
    const result = await recordProgress(
      getRunTokensTableClient(),
      runToken,
      candyPoints,
      killPoints,
    )
    return { status: result === 'ok' ? 200 : 422, jsonBody: { ok: result === 'ok' } }
  } catch (err) {
    context.error('reportProgress failed', err)
    return { status: 500, jsonBody: { error: 'Failed to record progress.' } }
  }
}

app.http('reportProgress', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'reportProgress',
  handler: reportProgress,
})
