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
      // En Android abrimos el login de Google en el navegador del sistema
      // (Google bloquea OAuth dentro de webviews). Al terminar, Supabase
      // redirige al deep link com.workledger.app://auth/callback, que reabre
      // la app; NativeAuthListener captura el código y completa la sesión.
      const { Browser } = await import('@capacitor/browser')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.workledger.app://auth/callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (!data?.url) throw new Error('No se pudo iniciar el login con Google')
      await Browser.open({ url: data.url, presentationStyle: 'popover' })
      return
    }

    // En web: redirección normal al callback del servidor
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
