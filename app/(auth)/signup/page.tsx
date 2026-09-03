'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { signupAction } from '../actions'
import { Mail, Lock, Loader2, KeyRound, Eye, EyeOff, HelpCircle, ArrowRight, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      toast.error('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const res = await signupAction(formData)
      if (res && res.error) {
        setError(res.error)
        toast.error(res.error)
      } else {
        toast.success('Account created! Welcome to your dashboard.')
      }
    } catch (err: any) {
      if (err.digest?.startsWith('NEXT_REDIRECT') || err.message?.includes('NEXT_REDIRECT')) {
        throw err
      }
      const msg = err.message || 'Registration failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-white overflow-hidden font-sans">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,rgba(139,92,246,0.02)_50%,transparent_100%)] blur-2xl pointer-events-none" />
      <div className="absolute top-12 left-12 w-64 h-64 bg-indigo-500/[0.01] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-64 h-64 bg-purple-500/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative w-full max-w-md space-y-6 animate-fade-in">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5 shadow-xl text-purple-400 group hover:border-purple-500/30 transition-all duration-300">
            <KeyRound className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Create Your Account
            </h2>
            <p className="text-zinc-500 text-sm max-w-xs">
              Start keeping all your Supabase projects alive 24/7.
            </p>
          </div>
        </div>

        {/* Signup Card */}
        <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-xl shadow-2xl p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-black/80">
          
          <CardHeader className="space-y-1.5 p-0 pb-6">
            <CardTitle className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-400" />
              Sign Up
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs">
              Enter your details below to create your private account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              
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
                    placeholder="user@example.com"
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    className="pl-10 pr-10 h-10 border-white/5 bg-zinc-950/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 h-10 border-white/5 bg-zinc-950/50 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/10 transition-all rounded-xl text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 leading-relaxed">
                  {error}
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Go to Dashboard'
                )}
              </Button>

            </form>

            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
              <span>Already have an account?</span>
              <Link 
                href="/login" 
                className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 transition-colors"
              >
                Sign In <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* How It Works Link */}
        <div className="flex items-center justify-center">
          <Link
            href="/how-it-works"
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>How does Supabase Forever work?</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
