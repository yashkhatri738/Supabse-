'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Database, 
  Search, 
  X, 
  Loader2,
  Terminal,
  ShieldAlert,
  Server,
  LogOut,
  User,
  Activity,
  Copy,
  Check,
  HelpCircle
} from 'lucide-react'
import { 
  saveConnectionAction, 
  deleteConnectionAction, 
  syncConnectionsAction, 
  getConnectionsAction, 
  logoutAction,
  pingSingleConnectionAction
} from '@/app/(auth)/actions'
import { toast } from 'sonner'

interface Connection {
  id: string
  name: string
  supabase_url: string
  status: string
  error_message: string | null
  last_pinged_at: string | null
  created_at: string
  db_host: string | null
}

interface DashboardViewProps {
  initialConnections: Connection[]
  userEmail: string | undefined
}

export default function DashboardView({ initialConnections, userEmail }: DashboardViewProps) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pingingId, setPingingId] = useState<string | null>(null)

  // Ping a single connection immediately
  async function handlePingSingle(conn: Connection) {
    setPingingId(conn.id)
    toast.loading(`Pinging ${conn.name}...`, { id: `ping-${conn.id}` })
    try {
      const res = await pingSingleConnectionAction(conn.id)
      if (res && res.success) {
        toast.success(`Pinged ${conn.name} successfully! (${res.durationMs || 0}ms)`, { 
          id: `ping-${conn.id}`,
          duration: 4000 
        })
        await refreshConnections()
      } else {
        toast.error(`Ping failed for ${conn.name}: ${res?.error || 'Unknown error'}`, { 
          id: `ping-${conn.id}`,
          duration: 6000 
        })
        await refreshConnections()
      }
    } catch (err: any) {
      toast.error(`Ping execution error: ${err.message || err}`, { id: `ping-${conn.id}` })
    } finally {
      setPingingId(null)
    }
  }

  // Reload connections from DB
  async function refreshConnections() {
    try {
      const res = await getConnectionsAction()
      if (res.error) {
        toast.error(res.error)
      } else {
        setConnections(res.connections || [])
      }
    } catch (err: any) {
      toast.error('Failed to load connections: ' + (err.message || err))
    }
  }

  // Handle connection registration
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await saveConnectionAction(formData)
      if (res && res.error) {
        setError(res.error)
        toast.error('Failed to register project: ' + res.error)
      } else {
        setIsModalOpen(false)
        await refreshConnections()
        
        // Immediately run initial keep-alive sync with live progress toast
        toast.loading('Running initial keep-alive sync...', { id: 'init-sync' })
        try {
          const syncRes = await syncConnectionsAction()
          if (syncRes && syncRes.success) {
            toast.success('Project added & keep-alive verified active!', { id: 'init-sync', duration: 4000 })
          } else {
            toast.success('Project registered! Scheduled for daily sync.', { id: 'init-sync', duration: 4000 })
          }
        } catch {
          toast.success('Project registered successfully!', { id: 'init-sync' })
        }
        await refreshConnections()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle connection deletion
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the "${name}" connection?`)) {
      return
    }

    toast.loading('Deleting connection...', { id: 'delete' })
    try {
      const res = await deleteConnectionAction(id)
      if (res && res.error) {
        toast.error(res.error, { id: 'delete' })
      } else {
        toast.success('Connection deleted successfully', { id: 'delete' })
        await refreshConnections()
      }
    } catch (err: any) {
      toast.error(err.message || 'Delete failed', { id: 'delete' })
    }
  }

  // Handle manual keep-alive sync
  async function handleSyncAll() {
    setIsSyncing(true)
    toast.loading('Triggering keep-alive updates...', { id: 'sync' })
    try {
      const res = await syncConnectionsAction()
      if (!res.success) {
        toast.error(res.error || 'Sync failed', { id: 'sync' })
      } else {
        const successes = res.processed! - res.failures!
        toast.success(`Keep-alive completed! Succeeded: ${successes}, Failed: ${res.failures}`, { 
          id: 'sync',
          duration: 5000 
        })
        await refreshConnections()
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync execution failed', { id: 'sync' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Copy Supabase URL to clipboard
  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('URL copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Format date nicely
  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter connections based on search query
  const filteredConnections = connections.filter(conn => 
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    conn.supabase_url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden font-sans">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,rgba(99,102,241,0.02)_60%,transparent_100%)] blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-purple-400 shadow-md">
              <Database className="h-5 w-5 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.3)]" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-base flex items-center gap-1.5">
                Supabase Forever
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/how-it-works"
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/5 bg-zinc-900/40 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              title="Learn how Supabase Forever works"
            >
              <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
              <span>How It Works</span>
            </Link>

            {userEmail && (
              <div className="hidden sm:flex items-center gap-2 border border-white/5 bg-zinc-900/40 px-3 py-1 rounded-full text-xs text-zinc-400">
                <User className="h-3 w-3 text-zinc-500" />
                {userEmail}
              </div>
            )}

            <form action={logoutAction}>
              <button
                type="submit"
                className="h-8 px-3 rounded-lg border border-white/5 bg-zinc-900/40 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in relative z-10">
        
        {/* Banner Details */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Keep-Alive Console
            </h1>
            <p className="text-zinc-500 text-sm mt-1 max-w-xl">
              Monitors and updates your Supabase free-tier database projects to prevent them from being paused automatically due to inactivity.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || connections.length === 0}
              className="bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white font-medium px-4 h-10 transition-all rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-purple-400' : ''}`} />
              <span>Run Sync</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-4 h-10 transition-all rounded-xl flex items-center gap-2 cursor-pointer border border-purple-500/20 shadow-lg shadow-purple-500/10 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Project</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="border border-white/5 bg-zinc-900/20 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-black/40">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Databases</span>
              <p className="text-2xl font-bold text-white">{connections.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400">
              <Database className="h-5 w-5" />
            </div>
          </div>

          <div className="border border-white/5 bg-zinc-900/20 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-black/40">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Healthy Status</span>
              <p className="text-2xl font-bold text-emerald-400">
                {connections.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
          </div>

          <div className="border border-white/5 bg-zinc-900/20 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-black/40">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Failing Status</span>
              <p className={`text-2xl font-bold ${connections.filter(c => c.status === 'failed').length > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {connections.filter(c => c.status === 'failed').length}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              connections.filter(c => c.status === 'failed').length > 0 
                ? 'bg-red-500/5 border border-red-500/10 text-red-400' 
                : 'bg-zinc-900 border border-white/5 text-zinc-600'
            }`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Search Input bar */}
        <div className="flex items-center bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 w-full max-w-sm">
          <Search className="h-4 w-4 text-zinc-500 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-zinc-600 w-full focus:ring-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white p-0.5">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Project List */}
        {filteredConnections.length === 0 ? (
          <div className="border border-white/5 border-dashed rounded-3xl p-16 text-center bg-zinc-900/5 backdrop-blur-md">
            <Database className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-zinc-400">No projects monitored</h3>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto mt-1">
              {searchQuery 
                ? "No registered databases match your query." 
                : "Register a Supabase connection database to start the daily automation scheduler."
              }
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-zinc-300 font-medium px-4 h-9 transition-all rounded-xl cursor-pointer text-xs"
              >
                Register First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredConnections.map((conn) => (
              <div 
                key={conn.id} 
                className="group relative border border-white/5 bg-zinc-900/10 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-black/50 p-6 flex flex-col justify-between min-h-[170px]"
              >
                {/* Upper row details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-base truncate max-w-[200px]">
                        {conn.name}
                      </span>
                      
                      {/* Pulsing indicator dots */}
                      <span className={`h-2 w-2 rounded-full ${
                        conn.status === 'active' 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                          : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'
                      }`} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePingSingle(conn)}
                        disabled={pingingId === conn.id || isSyncing}
                        className="h-7 px-2.5 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-purple-500/10 hover:border-purple-500/30 text-zinc-400 hover:text-purple-300 flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                        title="Ping this database now"
                      >
                        <RefreshCw className={`h-3 w-3 ${pingingId === conn.id ? 'animate-spin text-purple-400' : ''}`} />
                        <span>{pingingId === conn.id ? 'Pinging...' : 'Ping Now'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(conn.id, conn.name)}
                        className="h-7 w-7 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-red-500/10 hover:border-red-500/20 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete connection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* URL Row */}
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-950/40 px-3 py-1.5 rounded-lg border border-white/[0.02]">
                    <span className="truncate flex-1">{conn.supabase_url}</span>
                    <button
                      onClick={() => handleCopyUrl(conn.supabase_url, conn.id)}
                      className="text-zinc-600 hover:text-zinc-300 p-0.5 shrink-0"
                      title="Copy URL"
                    >
                      {copiedId === conn.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {conn.db_host && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400 bg-purple-500/[0.02] border border-purple-500/10 px-3 py-1.5 rounded-lg">
                      <span className="text-zinc-500">Host:</span>
                      <span className="truncate flex-1">{conn.db_host}</span>
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div className="mt-4 border-t border-white/5 pt-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-zinc-600" />
                    <span>Last Ping: {formatDate(conn.last_pinged_at)}</span>
                  </div>

                  <span className={`font-semibold uppercase tracking-wider ${
                    conn.status === 'active' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {conn.status === 'active' ? 'HEALTHY' : 'FAILED'}
                  </span>
                </div>

                {/* Error Log */}
                {conn.status === 'failed' && conn.error_message && (
                  <div className="mt-3 rounded-lg bg-red-500/[0.02] border border-red-500/10 p-3 text-[11px] text-red-400 font-mono flex items-start gap-2 max-h-20 overflow-y-auto">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                    <div className="leading-normal">
                      <span className="font-bold">Log:</span> {conn.error_message}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </main>

      {/* Glassmorphic custom modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 transition-all animate-fade-in duration-200">
          <div className="relative w-full max-w-lg border border-white/5 bg-zinc-950 p-6 sm:p-8 rounded-2xl shadow-2xl overflow-hidden animate-scale-in duration-200 space-y-6">
            
            {/* Ambient glows inside modal */}
            <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-purple-600/[0.04] blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-indigo-600/[0.04] blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Register Database</h2>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false)
                  setError(null)
                }} 
                className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Project Name</label>
                <Input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Production Main"
                  className="h-10 border-white/5 bg-zinc-900/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Supabase URL</label>
                <Input
                  name="supabaseUrl"
                  type="url"
                  required
                  placeholder="https://xxxxxxxx.supabase.co"
                  className="h-10 border-white/5 bg-zinc-900/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm font-mono"
                  disabled={isLoading}
                />
              </div>


              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Postgres DB Password</label>
                <Input
                  name="dbPassword"
                  type="password"
                  required
                  placeholder="Database user postgres password"
                  className="h-10 border-white/5 bg-zinc-900/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Anon Public Key</label>
                  <Input
                    name="anonKey"
                    type="password"
                    required
                    placeholder="eyJhbGciOi..."
                    className="h-10 border-white/5 bg-zinc-900/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Service Role Key</label>
                  <Input
                    name="serviceRoleKey"
                    type="password"
                    required
                    placeholder="eyJhbGciOi..."
                    className="h-10 border-white/5 bg-zinc-900/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/[0.02] border border-red-500/15 p-3 text-[11px] text-red-400 font-mono">
                  <strong>Verification Error:</strong> {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setError(null)
                  }}
                  className="h-9 px-4 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="h-9 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-900/30 hover:shadow-purple-600/30 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-purple-400/20 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      <span>Saving Project...</span>
                    </>
                  ) : (
                    <span>Verify & Save</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
