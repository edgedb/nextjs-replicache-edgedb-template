import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { processPull, PullRequest } from './process-pull'

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  /**
   * `<clientid>-<sessionid>-<request count>`
   * @docs https://doc.replicache.dev/reference/server-pull#x-replicache-requestid
   */
  const requestID = request.headers.get('X-Replicache-RequestID')
  const [clientID, sessionID, requestCount] = requestID?.split('-') ?? []
  const userID = z.string().parse(url.searchParams.get('userID'))
  const body = await request.json()
  console.log(`Processing pull`, JSON.stringify(body, null, ''))

  const pull = PullRequest.parse(body)
  const { clientGroupID: clientGroupID } = pull

  const response = await processPull({
    user_id: userID,
    client_group_id: clientGroupID,
    cookie: pull.cookie,
  })

  return NextResponse.json(response)
}
