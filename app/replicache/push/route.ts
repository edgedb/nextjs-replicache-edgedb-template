import { CustomPushRequest } from '@/lib/replicache.types'
import { type NextRequest } from 'next/server'
import { process_push } from './process-push'

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log(`Processing push`, CustomPushRequest.parse(body))

  // @TODO error handling
  await process_push(CustomPushRequest.parse(body))

  return new Response(null, {
    status: 200,
  })
}
