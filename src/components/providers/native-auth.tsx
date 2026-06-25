'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
        // Cerramos el navegador del sistema en cuanto volvemos a la app
        await Browser.close().catch(() => {})
        try {
          const parsed = new URL(url)
          const errorDescription =
            parsed.searchParams.get('error_description') ||
            parsed.searchParams.get('error')
          if (errorDescription) {
            toast.error(`Google: ${errorDescription}`)
            return
          }
          const code = parsed.searchParams.get('code')
          if (!code) return
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            toast.error(`No se pudo completar el inicio de sesión: ${error.message}`)
            return
          }
          // Solo navegamos al dashboard si la sesión se creó correctamente
          router.push('/dashboard')
          router.refresh()
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Error al completar el inicio de sesión')
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
