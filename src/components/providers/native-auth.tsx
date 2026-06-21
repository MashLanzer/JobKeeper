'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * En la APK (Capacitor), el login con Google ocurre en el navegador del sistema.
 * Al terminar, Google redirige al deep link `com.workledger.app://auth?code=...`,
 * Android reabre la app y aquí capturamos el código para completar la sesión
 * DENTRO de la app (no en el navegador).
 */
export function NativeAuthListener() {
  const router = useRouter()

  useEffect(() => {
    let remove: (() => void) | undefined

    const setup = async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')
      const supabase = createClient()

      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.includes('auth')) return
        try {
          const code = new URL(url).searchParams.get('code')
          if (code) {
            await supabase.auth.exchangeCodeForSession(code)
          }
        } catch {
          // ignorar errores de parseo
        } finally {
          await Browser.close().catch(() => {})
          router.push('/dashboard')
          router.refresh()
        }
      })

      remove = () => {
        handle.remove()
      }
    }

    setup()
    return () => {
      remove?.()
    }
  }, [router])

  return null
}
