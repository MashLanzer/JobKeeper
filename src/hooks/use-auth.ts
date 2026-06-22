'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase.auth])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [supabase.auth])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [supabase.auth])

  const signInWithGoogle = useCallback(async () => {
    const { Capacitor } = await import('@capacitor/core')

    if (Capacitor.isNativePlatform()) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
        await GoogleAuth.initialize()
        const googleUser = await GoogleAuth.signIn()
        const idToken = googleUser.authentication?.idToken
        if (!idToken) {
          const info = JSON.stringify({ auth: googleUser.authentication, email: googleUser.email })
          alert(`[DEBUG] Sin idToken. Datos: ${info}`)
          throw new Error('No se obtuvo idToken de Google')
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        })
        if (error) {
          alert(`[DEBUG] Error Supabase: ${error.message} (${error.status ?? ''})`)
          throw error
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.startsWith('[DEBUG]') && !msg.includes('idToken') && !msg.includes('Supabase')) {
          alert(`[DEBUG] Error GoogleAuth.signIn: ${msg}`)
        }
        throw err
      }
      return
    }

    // En web: redirección normal al callback
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?next=/dashboard`
      : '/auth/callback?next=/dashboard'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }, [supabase.auth])

  return { user, loading, signOut, signInWithEmail, signUpWithEmail, signInWithGoogle }
}
