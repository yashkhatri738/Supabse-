'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginAction } from '../actions'
import { ShieldCheck, Mail, Lock, Loader2, KeyRound } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await loginAction(formData)
      if (res && res.error) {
        setError(res.error)
      }
    } catch (err: any) {
      if (err.digest?.startsWith('NEXT_REDIRECT') || err.message?.includes('NEXT_REDIRECT')) {
        throw err
      }
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-white overflow-hidden font-sans">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,rgba(139,92,246,0.02)_50%,transparent_100%)] blur-2xl pointer-events-none" />
      <div className="absolute top-12 left-12 w-64 h-64 bg-indigo-500/[0.01] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-64 h-64 bg-purple-500/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative w-full max-w-md space-y-8 animate-fade-in">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5 shadow-xl text-purple-400 group hover:border-purple-500/30 transition-all duration-300">
            <KeyRound className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Supabase Forever
            </h2>
            <p className="text-zinc-500 text-sm max-w-xs">
              Secure admin console to keep your database instances alive.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-xl shadow-2xl p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-black/80">
          
          <CardHeader className="space-y-1.5 p-0 pb-6">
            <CardTitle className="text-xl font-semibold text-white tracking-tight">
              Sign In
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs">
              Enter your credentials below to access the dashboard.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="admin@example.com"
                    className="pl-10 h-10 border-white/5 bg-zinc-950/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="pl-10 h-10 border-white/5 bg-zinc-950/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-xs text-red-400 font-mono leading-relaxed">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-xl hover:shadow-purple-500/10 transition-all duration-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-purple-500/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Connecting...
                  </>
                ) : (
                  'Access Console'
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-zinc-600 text-xs font-mono">
            SECURE ACCESS ONLY
          </p>
        </div>
      </div>
    </div>
  )
}
