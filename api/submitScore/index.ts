import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions'

export async function submitScore(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('submitScore placeholder invoked')
  return {
    status: 200,
    jsonBody: { ok: true, endpoint: 'submitScore', placeholder: true },
  }
}

app.http('submitScore', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'submitScore',
  handler: submitScore,
})
