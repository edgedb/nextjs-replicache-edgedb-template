import { CustomPullRequest } from '@/lib/replicache.types'
import { NextResponse, type NextRequest } from 'next/server'
import { process_pull } from './process-pull'

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log(`Processing pull`, CustomPullRequest.parse(body))

  const response = await process_pull(CustomPullRequest.parse(body))

  return NextResponse.json(response, {
    status: 200,
  })
}
