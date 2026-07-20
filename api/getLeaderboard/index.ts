import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions'

export async function getLeaderboard(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('getLeaderboard placeholder invoked')
  return {
    status: 200,
    jsonBody: { ok: true, endpoint: 'getLeaderboard', placeholder: true },
  }
}

app.http('getLeaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getLeaderboard',
  handler: getLeaderboard,
})
