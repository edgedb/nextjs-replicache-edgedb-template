import { CustomPushRequest } from '@/lib/replicache.types'
import { NextResponse, type NextRequest } from 'next/server'
import { process_push } from './process-push'

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log(`Processing push`, JSON.stringify(body, null, ''))

  const response = await process_push(CustomPushRequest.parse(body))

  return NextResponse.json(response)
}
