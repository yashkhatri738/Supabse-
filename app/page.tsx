import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/admin'
import { ensureConnectionsTableExists, initBackgroundCron } from '@/lib/db'
import DashboardView from '@/components/DashboardView'

export default async function Home() {
  // 1. Start background auto-ping scheduler (12-hour interval check)
  initBackgroundCron()

  // 2. Ensure the database connections table is created and RLS configured
  await ensureConnectionsTableExists()

  // 3. Authenticate session user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()


  // 3. Load connections metadata (excluding secrets like passwords and service keys)
  let connections: any[] = []
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('connections')
      .select('id, name, supabase_url, status, error_message, last_pinged_at, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      connections = data
    }
  } catch (err) {
    console.error('Failed to load initial connections:', err)
  }

  return (
    <DashboardView 
      initialConnections={connections} 
      userEmail={user?.email} 
    />
  )
}

