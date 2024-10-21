import { CustomPullRequest } from '@/lib/replicache.types'
import { NextResponse, type NextRequest } from 'next/server'
import { process_pull } from './process-pull'

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log(`Processing pull`, JSON.stringify(body, null, ''))

  const response = await process_pull(CustomPullRequest.parse(body))

  return NextResponse.json(response)
}
