'use client'

import { useEffect } from 'react'
import { ensurePermission, syncAllReminders } from '@/lib/local-notifications'

/** Pide permiso de notificaciones y reprograma los recordatorios al abrir la app. */
export function NotificationInit() {
  useEffect(() => {
    ;(async () => {
      const ok = await ensurePermission()
      if (ok) await syncAllReminders()
    })()
  }, [])
  return null
}
