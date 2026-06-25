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
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      try {
        await GoogleAuth.initialize({
          clientId: '1050862543307-u88inlu21qv80r3t072568t3fo357dn2.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        })
        const googleUser = await GoogleAuth.signIn()
        const idToken = googleUser.authentication?.idToken
        if (!idToken) throw new Error('No idToken recibido de Google')
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        })
        if (error) throw error
      } catch (err: unknown) {
        const msg = err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err)
        throw new Error(`[Android] ${msg}`)
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
