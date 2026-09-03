import { NextResponse } from 'next/server'
import { runKeepAliveSync } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handleCron(request: Request) {
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

  const startTime = Date.now()
  console.log('⏰ CRON: Triggering daily keep-alive sync at', new Date().toISOString())
  const result = await runKeepAliveSync()
  const durationMs = Date.now() - startTime

  return NextResponse.json(
    { ...result, durationMs, triggeredAt: new Date().toISOString() }, 
    { status: result.success ? 200 : 500 }
  )
}

export async function GET(request: Request) {
  return handleCron(request)
}

export async function POST(request: Request) {
  return handleCron(request)
}
