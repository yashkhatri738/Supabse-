'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Database, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Server, 
  ArrowRight, 
  ArrowLeft,
  KeyRound,
  ExternalLink,
  Code2,
  Lock,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/20 selection:text-purple-300">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none opacity-60" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,rgba(99,102,241,0.03)_60%,transparent_100%)] blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-purple-400 group-hover:border-purple-500/30 transition-all shadow-md">
              <Database className="h-5 w-5 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.3)]" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-base flex items-center gap-1.5">
                Supabase Forever
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-8 px-3.5 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-5xl mx-auto px-4 py-16 space-y-20">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/[0.04] text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            Automated Keep-Alive Architecture
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            How <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-white bg-clip-text text-transparent">Supabase Forever</span> Keeps Your Database Alive
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            Free Supabase projects automatically pause after 7 days of inactivity. 
            Supabase Forever prevents this by executing an automated daily heartbeat write transaction to ensure your projects never go to sleep.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="h-10 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* 3 Pillars of Operation */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="border border-white/5 bg-zinc-900/20 backdrop-blur-sm rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg tracking-tight">The 7-Day Inactivity Rule</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Supabase free tier automatically pauses projects that have had zero active database connections for 7 consecutive days. When paused, your live APIs fail and unpausing takes minutes.
            </p>
          </div>

          <div className="border border-white/5 bg-zinc-900/20 backdrop-blur-sm rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg tracking-tight">Daily Heartbeat Transaction</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Every 24 hours, our system sends a lightweight query through Supabase&apos;s connection pooler. It creates an isolated <code className="bg-purple-500/10 text-purple-300 px-1 rounded font-mono">keep_alive</code> table and updates a timestamp row.
            </p>
          </div>

          <div className="border border-white/5 bg-zinc-900/20 backdrop-blur-sm rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg tracking-tight">100% Isolated & Private</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              We never read or alter your application tables, rows, or user data. Each user only sees their own registered databases, and the heartbeat query touches only its own dedicated table.
            </p>
          </div>

        </section>

        {/* Technical Flow Diagram */}
        <section className="border border-white/5 bg-zinc-900/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-400" />
              Under the Hood: Smart IPv4 Pooler Auto-Discovery
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm">
              How our system overcomes Vercel IPv6 restrictions and multi-region routing:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono">
            
            <div className="border border-white/5 bg-zinc-950/60 p-4 rounded-xl space-y-2">
              <span className="text-purple-400 font-bold">01. Automated Cron</span>
              <p className="text-zinc-400 font-sans leading-relaxed">
                Vercel Cron triggers the secure endpoint every day at 00:00 UTC.
              </p>
            </div>

            <div className="border border-white/5 bg-zinc-950/60 p-4 rounded-xl space-y-2">
              <span className="text-purple-400 font-bold">02. Region Detection</span>
              <p className="text-zinc-400 font-sans leading-relaxed">
                Automatically resolves regional poolers (Sydney, Singapore, Mumbai, Virginia, etc.).
              </p>
            </div>

            <div className="border border-white/5 bg-zinc-950/60 p-4 rounded-xl space-y-2">
              <span className="text-purple-400 font-bold">03. Parallel Heartbeat</span>
              <p className="text-zinc-400 font-sans leading-relaxed">
                Pings all databases simultaneously in 3 seconds via transaction pooling (port 6543).
              </p>
            </div>

            <div className="border border-white/5 bg-zinc-950/60 p-4 rounded-xl space-y-2">
              <span className="text-purple-400 font-bold">04. Activity Registered</span>
              <p className="text-zinc-400 font-sans leading-relaxed">
                Supabase resets the 7-day pause timer. Your database stays active and online.
              </p>
            </div>

          </div>
        </section>

        {/* Step-by-Step Setup Guide */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Where to Find Your Supabase Credentials
            </h2>
            <p className="text-zinc-400 text-sm">
              Follow these simple steps in your Supabase dashboard to register any project in less than 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="border border-white/5 bg-zinc-900/20 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Globe className="h-4 w-4 text-purple-400" />
                1. Supabase Project URL
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                In your project dashboard, go to <strong>Project Settings ➔ Configuration ➔ API</strong>. Copy the <strong>Project URL</strong> (e.g. <code className="text-purple-300">https://abcdefg.supabase.co</code>).
              </p>
            </div>

            <div className="border border-white/5 bg-zinc-900/20 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Lock className="h-4 w-4 text-purple-400" />
                2. Database Password
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                The Postgres password you chose when creating your project. (If forgotten, you can reset it under <strong>Project Settings ➔ Database ➔ Database Password</strong>).
              </p>
            </div>

            <div className="border border-white/5 bg-zinc-900/20 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <KeyRound className="h-4 w-4 text-purple-400" />
                3. Anon Public Key
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Found under <strong>Project Settings ➔ API ➔ Project API keys</strong> labeled <code className="text-purple-300">anon</code> / <code className="text-purple-300">public</code>.
              </p>
            </div>

            <div className="border border-white/5 bg-zinc-900/20 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                4. Service Role Key
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Found in the same API keys section labeled <code className="text-purple-300">service_role</code> / <code className="text-purple-300">secret</code>.
              </p>
            </div>

          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center py-10 border-t border-white/5 space-y-4">
          <h3 className="text-2xl font-bold text-white tracking-tight">Ready to keep your databases active?</h3>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Add your Supabase project in seconds and let the automated daily sync keep it running 24/7.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 h-10 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg transition-all"
            >
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

      </main>

    </div>
  )
}
