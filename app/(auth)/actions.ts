'use server'

import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { ensureConnectionsTableExists, pingClientDatabase, runKeepAliveSync, pingSingleConnection } from '@/lib/db'

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD

  // Check if matching admin email configured in environment
  if (adminEmail && email === adminEmail) {
    if (password !== adminPassword) {
      return { error: 'Invalid email or password. Please check your credentials and try again.' }
    }

    // Check if the user already exists in Supabase Authentication
    try {
      const adminClient = createAdminClient()
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
      
      if (!listError) {
        const exists = users?.some(u => u.email?.toLowerCase() === email)

        if (!exists) {
          // Auto-provision admin in Supabase Authentication on first login
          const { error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          })

          if (createError) {
            console.error('Failed to provision admin:', createError.message)
          }
        }
      }
    } catch (err: any) {
      console.error('Admin provision error:', err)
    }
  }

  let success = false
  try {
    const supabase = await createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      // Return user-friendly error instead of raw Supabase string
      return { error: 'Invalid email or password. Please check your credentials and try again.' }
    }
    success = true
  } catch (err: any) {
    return { error: 'Unable to connect to authentication server. Please try again.' }
  }

  if (success) {
    redirect('/')
  }
}

export async function signupAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  try {
    const adminClient = createAdminClient()

    // 1. Create the user with auto-confirmed email so they don't get blocked by email verification
    const { error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      if (createError.message.toLowerCase().includes('already') || createError.message.toLowerCase().includes('exists')) {
        return { error: 'An account with this email already exists. Please sign in instead.' }
      }
      return { error: createError.message }
    }

    // 2. Automatically sign them in immediately to establish session cookies
    const supabase = await createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      return { error: 'Account created, but auto-login failed. Please sign in.' }
    }
  } catch (err: any) {
    return { error: err.message || 'Registration failed. Please try again.' }
  }

  // Redirect directly to dashboard (never to login page)
  redirect('/')
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

  // 1. Verify remote project connection & create keep_alive table in target project
  // Auto-resolves working regional IPv4 pooler host dynamically
  const pingRes = await pingClientDatabase(name, supabaseUrl, dbPassword)
  if (!pingRes.success) {
    return { success: false, error: `Failed to connect to target Supabase project: ${pingRes.error}` }
  }

  const finalHost = pingRes.workingHost || null

  // 2. Save credentials in our database linked to this specific user's account
  try {
    const adminClient = createAdminClient()
    const { data: inserted, error: insertError } = await adminClient.from('connections').insert({
      user_id: user.id,
      name,
      supabase_url: supabaseUrl,
      db_password: dbPassword,
      anon_key: anonKey,
      service_role_key: serviceRoleKey,
      status: 'active',
      last_pinged_at: new Date().toISOString(),
      db_host: finalHost
    }).select().single()

    if (insertError) {
      return { success: false, error: `Failed to save credentials in database: ${insertError.message}` }
    }

    return { success: true, detectedHost: finalHost, newConnection: inserted }
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
    // User isolation: each user ONLY sees connections that belong to their own user_id
    const { data, error } = await adminClient
      .from('connections')
      .select('id, name, supabase_url, status, error_message, last_pinged_at, created_at, db_host, user_id')
      .eq('user_id', user.id)
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
    // Ensure the user can only delete their own connection
    const { error } = await adminClient
      .from('connections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

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

export async function pingSingleConnectionAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  return await pingSingleConnection(id)
}
