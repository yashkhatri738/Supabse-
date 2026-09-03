import postgres from 'postgres'
import { createAdminClient } from './admin'

// Known Supabase IPv4 shared pooler hosts across all AWS regions
export const KNOWN_POOLER_HOSTS = [
  'aws-1-ap-southeast-1.pooler.supabase.com', // Singapore (aws-1)
  'aws-0-ap-southeast-1.pooler.supabase.com', // Singapore (aws-0)
  'aws-1-ap-southeast-2.pooler.supabase.com', // Sydney (aws-1)
  'aws-0-ap-southeast-2.pooler.supabase.com', // Sydney (aws-0)
  'aws-0-ap-south-1.pooler.supabase.com',     // Mumbai (aws-0)
  'aws-1-ap-south-1.pooler.supabase.com',     // Mumbai (aws-1)
  'aws-0-us-east-1.pooler.supabase.com',      // N. Virginia (aws-0)
  'aws-1-us-east-1.pooler.supabase.com',      // N. Virginia (aws-1)
  'aws-0-us-west-1.pooler.supabase.com',      // N. California
  'aws-0-eu-central-1.pooler.supabase.com',   // Frankfurt (aws-0)
  'aws-1-eu-central-1.pooler.supabase.com',   // Frankfurt (aws-1)
  'aws-0-eu-west-1.pooler.supabase.com',      // Ireland
  'aws-0-eu-west-2.pooler.supabase.com',      // London
  'aws-0-ap-northeast-1.pooler.supabase.com', // Tokyo
  'aws-0-sa-east-1.pooler.supabase.com',      // Sao Paulo
  'aws-0-ca-central-1.pooler.supabase.com',   // Central Canada
]

export function extractProjectRef(supabaseUrl: string): string {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.(?:co|net)/)
  if (!match) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
  }
  return match[1]
}

export function getConnectionString(
  supabaseUrl: string, 
  password: string, 
  dbHost?: string, 
  direct = false
): string {
  const ref = extractProjectRef(supabaseUrl)
  
  // Use user-provided host or fall back to process.env.DB_HOST or default Singapore pooler
  let host = dbHost?.trim() || process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com'
  
  // Clean host in case protocol or port was included
  host = host.replace(/^postgresql:\/\//, '').split(':')[0]
  
  const isPooler = host.includes('pooler.supabase.com')
  const port = direct ? 5432 : (isPooler ? 6543 : 5432)
  const user = isPooler ? `postgres.${ref}` : 'postgres'
  
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres?sslmode=require`
}

/**
 * Test a single database host quickly (timeout in 4s)
 */
async function testHostConnection(
  host: string, 
  ref: string, 
  password: string, 
  direct = false
): Promise<boolean> {
  const isPooler = host.includes('pooler.supabase.com')
  const port = direct ? 5432 : (isPooler ? 6543 : 5432)
  const user = isPooler ? `postgres.${ref}` : 'postgres'
  const connStr = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres?sslmode=require`
  
  const sql = postgres(connStr, { connect_timeout: 4, ssl: 'require', max: 1 })
  try {
    await sql`SELECT 1 as val`
    return true
  } catch {
    return false
  } finally {
    try { await sql.end() } catch {}
  }
}

/**
 * Intelligent pooler resolver: tests candidate poolers and finds the working one
 */
export async function resolveWorkingHost(
  supabaseUrl: string, 
  password: string, 
  preferredHost?: string
): Promise<{ host: string; direct: boolean } | null> {
  const ref = extractProjectRef(supabaseUrl)

  // 1. Try preferred host if provided
  if (preferredHost && preferredHost.trim()) {
    const cleanPreferred = preferredHost.trim().replace(/^postgresql:\/\//, '').split(':')[0]
    const worksPooler = await testHostConnection(cleanPreferred, ref, password, false)
    if (worksPooler) return { host: cleanPreferred, direct: false }

    const worksDirect = await testHostConnection(cleanPreferred, ref, password, true)
    if (worksDirect) return { host: cleanPreferred, direct: true }
  }

  // 2. Check environment variable host if set
  if (process.env.DB_HOST && process.env.DB_HOST !== preferredHost) {
    const envHost = process.env.DB_HOST.trim().replace(/^postgresql:\/\//, '').split(':')[0]
    const works = await testHostConnection(envHost, ref, password, false)
    if (works) return { host: envHost, direct: false }
  }

  // 3. Probe candidate poolers in parallel batches for ultra-fast discovery
  // Priority order: Singapore, Sydney, Mumbai, US East, EU Central, Tokyo, etc.
  for (const host of KNOWN_POOLER_HOSTS) {
    if (host === preferredHost) continue
    const works = await testHostConnection(host, ref, password, false)
    if (works) {
      console.log(`[Auto-Discovery] Found working pooler for project ${ref}: ${host}`)
      return { host, direct: false }
    }
  }

  // 4. Last resort: direct host db.<ref>.supabase.co (works if environment has IPv6)
  const directHost = `db.${ref}.supabase.co`
  const directWorks = await testHostConnection(directHost, ref, password, true)
  if (directWorks) {
    return { host: directHost, direct: true }
  }

  return null
}

export async function ensureConnectionsTableExists() {
  const ourUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ourPassword = process.env.SUPABASE_DB_PASSWORD
  const ourHost = process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com'
  if (!ourUrl || !ourPassword) {
    console.error('Missing our own database configuration (.env.local)')
    return
  }

  let connectionString = getConnectionString(ourUrl, ourPassword, ourHost, false)
  let sql = postgres(connectionString, { connect_timeout: 8, ssl: 'require' })
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        name TEXT NOT NULL,
        supabase_url TEXT NOT NULL,
        db_password TEXT NOT NULL,
        anon_key TEXT NOT NULL,
        service_role_key TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        error_message TEXT,
        last_pinged_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        db_host TEXT
      );
    `
    await sql`ALTER TABLE connections ADD COLUMN IF NOT EXISTS user_id UUID;`
    await sql`ALTER TABLE connections ADD COLUMN IF NOT EXISTS db_host TEXT;`
    await sql`ALTER TABLE connections ENABLE ROW LEVEL SECURITY;`

    // Migrate any legacy rows without user_id to the admin user
    try {
      const adminClient = createAdminClient()
      const { data: { users } } = await adminClient.auth.admin.listUsers()
      const adminUser = users?.find(u => u.email === (process.env.ADMIN_EMAIL || 'yashkhatri378@gmail.com'))
      if (adminUser) {
        await sql`UPDATE connections SET user_id = ${adminUser.id} WHERE user_id IS NULL;`
      }
    } catch (migrateErr) {
      console.warn('Could not auto-assign legacy connections:', migrateErr)
    }

    console.log('Successfully checked/created connections table, columns and RLS.')
  } catch (error: any) {
    console.warn('Failed to setup connections table via pooler, trying direct port...', error.message)
    try { await sql.end() } catch {}

    connectionString = getConnectionString(ourUrl, ourPassword, ourHost, true)
    sql = postgres(connectionString, { connect_timeout: 8, ssl: 'require' })
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          name TEXT NOT NULL,
          supabase_url TEXT NOT NULL,
          db_password TEXT NOT NULL,
          anon_key TEXT NOT NULL,
          service_role_key TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          error_message TEXT,
          last_pinged_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          db_host TEXT
        );
      `
      await sql`ALTER TABLE connections ADD COLUMN IF NOT EXISTS user_id UUID;`
      await sql`ALTER TABLE connections ADD COLUMN IF NOT EXISTS db_host TEXT;`
      await sql`ALTER TABLE connections ENABLE ROW LEVEL SECURITY;`
      console.log('Successfully setup connections table via direct port.')
    } catch (directError: any) {
      console.error('Failed to setup connections table:', directError.message)
    }
  } finally {
    try { await sql.end() } catch {}
  }
}

/**
 * Ping target Supabase database: creates keep_alive table and upserts a row
 */
export async function pingClientDatabase(
  name: string, 
  supabaseUrl: string, 
  dbPassword: string, 
  dbHost?: string
): Promise<{ success: boolean; error?: string; workingHost?: string }> {
  let activeHost = dbHost?.trim() || ''
  let isDirect = false

  // Try the configured host first
  if (activeHost) {
    const connStr = getConnectionString(supabaseUrl, dbPassword, activeHost, false)
    const sql = postgres(connStr, { connect_timeout: 8, ssl: 'require', max: 1 })
    try {
      await executeKeepAliveQuery(sql, name)
      return { success: true, workingHost: activeHost }
    } catch (err: any) {
      console.warn(`Ping failed with host ${activeHost} for ${name} (${err.message}). Attempting auto-resolution...`)
      try { await sql.end() } catch {}
    }
  }

  // If activeHost failed or was not provided, auto-resolve a working host
  const resolved = await resolveWorkingHost(supabaseUrl, dbPassword, activeHost)
  if (!resolved) {
    return {
      success: false,
      error: `Could not reach database. Neither pooler nor direct host could connect. Please verify your DB password and pooler host in Supabase settings.`
    }
  }

  activeHost = resolved.host
  isDirect = resolved.direct

  const connStr = getConnectionString(supabaseUrl, dbPassword, activeHost, isDirect)
  const sql = postgres(connStr, { connect_timeout: 8, ssl: 'require', max: 1 })
  try {
    await executeKeepAliveQuery(sql, name)
    return { success: true, workingHost: activeHost }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  } finally {
    try { await sql.end() } catch {}
  }
}

async function executeKeepAliveQuery(sql: any, name: string) {
  // 1. Create table in target database if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS keep_alive (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `

  // 2. Upsert the keep-alive row (forces a write transaction to keep DB active)
  await sql`
    INSERT INTO keep_alive (id, name, updated_at)
    VALUES (1, ${name}, now())
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, updated_at = now();
  `
}

/**
 * Ping all registered connections concurrently and update status
 */
export async function runKeepAliveSync() {
  try {
    const adminClient = createAdminClient()
    const { data: connections, error: fetchError } = await adminClient
      .from('connections')
      .select('*')

    if (fetchError) {
      return { success: false, error: `Failed to fetch connections: ${fetchError.message}` }
    }

    if (!connections || connections.length === 0) {
      return { success: true, processed: 0, failures: 0, results: [] }
    }

    // Ping all projects in parallel using Promise.allSettled
    const pingPromises = connections.map(async (conn) => {
      const startTime = Date.now()
      console.log(`[Ping] Starting: ${conn.name} (${conn.supabase_url}) [Host: ${conn.db_host || 'auto'}]`)
      const res = await pingClientDatabase(conn.name, conn.supabase_url, conn.db_password, conn.db_host)
      const durationMs = Date.now() - startTime

      const updateData: any = {
        status: res.success ? 'active' : 'failed',
        error_message: res.success ? null : res.error,
        last_pinged_at: new Date().toISOString()
      }

      // Automatically persist discovered working pooler host so future pings are immediate
      if (res.workingHost && res.workingHost !== conn.db_host) {
        updateData.db_host = res.workingHost
        console.log(`[Auto-Update] Updated db_host for ${conn.name} to ${res.workingHost}`)
      }

      const { error: updateError } = await adminClient
        .from('connections')
        .update(updateData)
        .eq('id', conn.id)

      if (updateError) {
        console.error(`Failed to update status for ${conn.name} in our DB:`, updateError.message)
      }

      return {
        id: conn.id,
        name: conn.name,
        success: res.success,
        error: res.success ? null : res.error,
        host: res.workingHost || conn.db_host,
        durationMs
      }
    })

    const settledResults = await Promise.allSettled(pingPromises)
    const results = settledResults.map((s, idx) => {
      if (s.status === 'fulfilled') return s.value
      const conn = connections[idx]
      return {
        id: conn.id,
        name: conn.name,
        success: false,
        error: s.reason?.message || String(s.reason),
        host: conn.db_host,
        durationMs: 0
      }
    })

    const failures = results.filter(r => !r.success).length

    return {
      success: failures === 0,
      processed: connections.length,
      failures,
      results
    }
  } catch (err: any) {
    console.error('Fatal error in keep alive sync:', err)
    return { success: false, error: err.message || String(err) }
  }
}

/**
 * Manually ping a single connection by ID
 */
export async function pingSingleConnection(id: string) {
  try {
    const adminClient = createAdminClient()
    const { data: conn, error: fetchError } = await adminClient
      .from('connections')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !conn) {
      return { success: false, error: fetchError?.message || 'Connection not found' }
    }

    const startTime = Date.now()
    const res = await pingClientDatabase(conn.name, conn.supabase_url, conn.db_password, conn.db_host)
    const durationMs = Date.now() - startTime

    const updateData: any = {
      status: res.success ? 'active' : 'failed',
      error_message: res.success ? null : res.error,
      last_pinged_at: new Date().toISOString()
    }

    if (res.workingHost && res.workingHost !== conn.db_host) {
      updateData.db_host = res.workingHost
    }

    await adminClient
      .from('connections')
      .update(updateData)
      .eq('id', conn.id)

    return {
      success: res.success,
      error: res.error,
      workingHost: res.workingHost || conn.db_host,
      durationMs
    }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}

/**
 * Local development background timer (only active during npm run dev, skipped in production/serverless)
 */
export function initBackgroundCron() {
  if (typeof window !== 'undefined') return
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return // Serverless functions are ephemeral; handled via vercel.json cron instead
  }

  const globalRef = global as any
  if (globalRef.keepAliveCronActive) {
    return
  }

  globalRef.keepAliveCronActive = true
  console.log('⏰ LOCAL DEV: Starting background keep-alive sync scheduler...')

  const intervalMs = 12 * 60 * 60 * 1000 // 12 hours
  globalRef.keepAliveCronInterval = setInterval(async () => {
    console.log('⏰ LOCAL DEV: Triggering scheduled keep-alive ping for all projects...')
    try {
      await runKeepAliveSync()
    } catch (err) {
      console.error('⏰ LOCAL DEV ERROR:', err)
    }
  }, intervalMs)
}
