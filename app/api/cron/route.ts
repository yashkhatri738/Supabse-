import { NextResponse } from 'next/server'
import { runKeepAliveSync } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secretParam = searchParams.get('secret')
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If a CRON_SECRET is configured, enforce authorization
  if (cronSecret) {
    const isAuthorized = 
      secretParam === cronSecret || 
      authHeader === `Bearer ${cronSecret}`

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  console.log('CRON: Triggering daily keep-alive sync...')
  const result = await runKeepAliveSync()
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
