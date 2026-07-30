import postgres from 'postgres'
import { createAdminClient } from './admin'

export function getConnectionString(supabaseUrl: string, password: string, dbHost?: string, direct = false) {
  // Extract project ref (e.g., https://hfprjaricsitvloflvhw.supabase.co -> hfprjaricsitvloflvhw)
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.(?:co|net)/)
  if (!match) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
  }
  const ref = match[1]
  
  // Use user-provided host or fall back to process.env.DB_HOST or default IPv4 pooler host
  let host = dbHost?.trim() || process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com'
  
  // Determine port and user
  let port = direct ? 5432 : 6543
  let user = 'postgres'
  
  if (host.includes('pooler.supabase.com')) {
    user = `postgres.${ref}`
  }
  
  // Clean host in case user included protocol or port
  host = host.replace(/^postgresql:\/\//, '').split(':')[0]
  
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres?sslmode=require`
}

export async function ensureConnectionsTableExists() {
  const ourUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ourPassword = process.env.SUPABASE_DB_PASSWORD
  const ourHost = process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com'
  if (!ourUrl || !ourPassword) {
    console.error('Missing our own database configuration (.env.local)')
    return
  }

  let connectionString = getConnectionString(ourUrl, ourPassword, ourHost, false) // try pooler
  let sql = postgres(connectionString, { connect_timeout: 10, ssl: 'require' })
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        supabase_url TEXT NOT NULL,
        db_password TEXT NOT NULL,
        anon_key TEXT NOT NULL,
        service_role_key TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        error_message TEXT,
        last_pinged_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `
    // Ensure the new db_host column is added if it does not exist
    await sql`ALTER TABLE connections ADD COLUMN IF NOT EXISTS db_host TEXT;`
    // Enable RLS for security
    await sql`ALTER TABLE connections ENABLE ROW LEVEL SECURITY;`
    console.log('Successfully checked/created connections table and enabled RLS via pooler.')
  } catch (error: any) {
    console.warn('Failed to create connections table via pooler, trying direct port...', error.message)
    try {
      await sql.end()
    } catch {}

    // Fallback to direct port 5432
    connectionString = getConnectionString(ourUrl, ourPassword, ourHost, true)
    sql = postgres(connectionString, { connect_timeout: 10, ssl: 'require' })
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          supabase_url TEXT NOT NULL,
          db_password TEXT NOT NULL,
          anon_key TEXT NOT NULL,
          service_role_key TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          error_message TEXT,
          last_pinged_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
      await sql`ALTER TABLE connections ADD COLUMN IF NOT EXISTS db_host TEXT;`
      await sql`ALTER TABLE connections ENABLE ROW LEVEL SECURITY;`
      console.log('Successfully checked/created connections table and enabled RLS via direct port.')
    } catch (directError: any) {
      console.error('Failed to create connections table via direct port:', directError.message)
    }
  } finally {
    try {
      await sql.end()
    } catch {}
  }
}

export async function pingClientDatabase(name: string, supabaseUrl: string, dbPassword: string, dbHost?: string) {
  let connectionString = getConnectionString(supabaseUrl, dbPassword, dbHost, false) // try pooler
  let sql = postgres(connectionString, { connect_timeout: 15, ssl: 'require' })

  try {
    // 1. Create table in target database if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS keep_alive (
        id INT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `

    // 2. Upsert the row with id = 1
    await sql`
      INSERT INTO keep_alive (id, name, updated_at)
      VALUES (1, ${name}, now())
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, updated_at = now();
    `
    return { success: true }
  } catch (error: any) {
    console.warn(`Failed to ping ${supabaseUrl} via pooler, trying direct/session connection...`, error.message)
    try {
      await sql.end()
    } catch {}

    // Fallback: try direct port / session port 5432
    connectionString = getConnectionString(supabaseUrl, dbPassword, dbHost, true)
    sql = postgres(connectionString, { connect_timeout: 15, ssl: 'require' })
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS keep_alive (
          id INT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
      await sql`
        INSERT INTO keep_alive (id, name, updated_at)
        VALUES (1, ${name}, now())
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, updated_at = now();
      `
      return { success: true }
    } catch (directError: any) {
      console.error(`Failed to ping ${supabaseUrl} via direct/session port (port 5432):`, directError.message)
      return { success: false, error: directError.message || String(directError) }
    }
  } finally {
    try {
      await sql.end()
    } catch {}
  }
}

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

    let failures = 0
    const results = []

    for (const conn of connections) {
      console.log(`Pinging project: ${conn.name} (${conn.supabase_url}) [Host: ${conn.db_host || 'default'}]`)
      const res = await pingClientDatabase(conn.name, conn.supabase_url, conn.db_password, conn.db_host)
      
      const updateData: any = {
        status: res.success ? 'active' : 'failed',
        error_message: res.success ? null : res.error,
        last_pinged_at: new Date().toISOString()
      }

      const { error: updateError } = await adminClient
        .from('connections')
        .update(updateData)
        .eq('id', conn.id)

      if (updateError) {
        console.error(`Failed to update status for ${conn.name} in our DB:`, updateError.message)
      }

      if (!res.success) {
        failures++
      }

      results.push({
        id: conn.id,
        name: conn.name,
        success: res.success,
        error: res.success ? null : res.error
      })
    }

    return {
      success: true,
      processed: connections.length,
      failures,
      results
    }
  } catch (err: any) {
    console.error('Fatal error in keep alive sync:', err)
    return { success: false, error: err.message || String(err) }
  }
}

export function initBackgroundCron() {
  if (typeof window !== 'undefined') return // only run on server
  
  const globalRef = global as any
  if (globalRef.keepAliveCronActive) {
    return
  }

  globalRef.keepAliveCronActive = true
  console.log('⏰ BACKGROUND SERVICE: Starting local daily keep-alive scheduler...')

  // Check and run sync every 12 hours
  const intervalMs = 12 * 60 * 60 * 1000 // 12 hours
  globalRef.keepAliveCronInterval = setInterval(async () => {
    console.log('⏰ BACKGROUND SERVICE: Triggering scheduled keep-alive ping for all projects...')
    try {
      await runKeepAliveSync()
    } catch (err) {
      console.error('⏰ BACKGROUND SERVICE ERROR:', err)
    }
  }, intervalMs)
}


