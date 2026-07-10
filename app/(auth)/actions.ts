'use server'

import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { ensureConnectionsTableExists, pingClientDatabase, runKeepAliveSync } from '@/lib/db'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  // Check if matching admin email
  if (email === adminEmail) {
    if (password !== adminPassword) {
      return { error: 'Invalid credentials' }
    }

    // Check if the user already exists in Supabase Authentication
    try {
      const adminClient = createAdminClient()
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
      
      if (listError) {
        return { error: `Failed to verify user status: ${listError.message}` }
      }

      const exists = users?.some(u => u.email === email)

      if (!exists) {
        // Save user in Supabase Authentication (first-time login)
        const { error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

        if (createError) {
          return { error: `Failed to register admin in Supabase: ${createError.message}` }
        }
      }
    } catch (err: any) {
      return { error: `Admin check/creation failed: ${err.message || err}` }
    }
  }

  let success = false
  // Standard login using the Supabase client
  try {
    const supabase = await createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      return { error: loginError.message }
    }
    success = true
  } catch (err: any) {
    return { error: `Login execution failed: ${err.message || err}` }
  }

  if (success) {
    redirect('/')
  }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function initDatabaseAction() {
  await ensureConnectionsTableExists()
  return { success: true }
}

export async function saveConnectionAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const supabaseUrl = formData.get('supabaseUrl') as string
  const dbPassword = formData.get('dbPassword') as string
  const anonKey = formData.get('anonKey') as string
  const serviceRoleKey = formData.get('serviceRoleKey') as string

  if (!name || !supabaseUrl || !dbPassword || !anonKey || !serviceRoleKey) {
    return { success: false, error: 'All fields are required' }
  }

  // 1. Verify remote project connection & create table in target project
  const pingRes = await pingClientDatabase(name, supabaseUrl, dbPassword)
  if (!pingRes.success) {
    return { success: false, error: `Failed to connect to target Supabase project: ${pingRes.error}` }
  }

  // 2. Save credentials in our database via Admin client
  try {
    const adminClient = createAdminClient()
    const { error: insertError } = await adminClient.from('connections').insert({
      name,
      supabase_url: supabaseUrl,
      db_password: dbPassword,
      anon_key: anonKey,
      service_role_key: serviceRoleKey,
      status: 'active',
      last_pinged_at: new Date().toISOString()
    })

    if (insertError) {
      return { success: false, error: `Failed to save credentials in database: ${insertError.message}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: `Save failed: ${err.message || err}` }
  }
}

export async function getConnectionsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', connections: [] }
  }

  try {
    const adminClient = createAdminClient()
    // Select non-sensitive fields to display in front-end
    const { data, error } = await adminClient
      .from('connections')
      .select('id, name, supabase_url, status, error_message, last_pinged_at, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: `Failed to load connections: ${error.message}`, connections: [] }
    }

    return { success: true, connections: data || [] }
  } catch (err: any) {
    return { success: false, error: `Database fetch failed: ${err.message || err}`, connections: [] }
  }
}

export async function deleteConnectionAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('connections').delete().eq('id', id)

    if (error) {
      return { success: false, error: `Failed to delete connection: ${error.message}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: `Delete execution failed: ${err.message || err}` }
  }
}

export async function syncConnectionsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  return await runKeepAliveSync()
}

