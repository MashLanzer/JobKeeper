// Recordatorios locales de trabajos. Se programan en el dispositivo (no
// requieren Firebase ni servidor) y suenan aunque la app esté cerrada.

import type { Job } from '@/types'

type ReminderJob = Pick<Job, 'id' | 'title' | 'scheduled_at'> & { client?: { name?: string } | null }

// id entero estable derivado del uuid del trabajo (para cancelar/reprogramar).
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % 2147483000) + 1
}

const LEAD: Record<string, number> = {
  '1h': 3600e3,
  '3h': 3 * 3600e3,
  '1d': 24 * 3600e3,
  '2d': 48 * 3600e3,
}

function leadMs(): number {
  if (typeof window === 'undefined') return LEAD['1d']
  return LEAD[localStorage.getItem('reminder_lead') || '1d'] ?? LEAD['1d']
}

function remindersEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('reminders_enabled') !== '0'
}

async function native() {
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.isNativePlatform()
}

/**
 * Envía una notificación de prueba (a los pocos segundos) para que el usuario
 * confirme que los recordatorios funcionan en su teléfono.
 * Devuelve 'ok' | 'no-permiso' | 'no-nativo'.
 */
export async function sendTestReminder(): Promise<'ok' | 'no-permiso' | 'no-nativo'> {
  if (!(await native())) return 'no-nativo'
  const granted = await ensurePermission()
  if (!granted) return 'no-permiso'
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 2147480000,
          title: 'Recordatorio de prueba',
          body: 'Así se verán los avisos de tus trabajos 👍',
          schedule: { at: new Date(Date.now() + 3000) },
        },
      ],
    })
    return 'ok'
  } catch {
    return 'no-permiso'
  }
}

/** Pide permiso de notificaciones (Android 13+). */
export async function ensurePermission(): Promise<boolean> {
  try {
    if (!(await native())) return false
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    return perm.display === 'granted'
  } catch {
    return false
  }
}

export async function scheduleJobReminder(job: ReminderJob) {
  try {
    if (!(await native())) return
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const id = hashId(job.id)
    // Siempre cancelamos el anterior (por si cambió la fecha o se desactivó).
    await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {})

    if (!remindersEnabled() || !job.scheduled_at) return
    const fireAt = new Date(new Date(job.scheduled_at).getTime() - leadMs())
    if (fireAt.getTime() <= Date.now()) return // no programamos avisos en el pasado

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Trabajo próximo',
          body: `${job.title}${job.client?.name ? ` · ${job.client.name}` : ''}`,
          schedule: { at: fireAt },
        },
      ],
    })
  } catch {
    // sin permiso o plugin no disponible
  }
}

export async function cancelJobReminder(jobId: string) {
  try {
    if (!(await native())) return
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: hashId(jobId) }] }).catch(() => {})
  } catch {
    // ignore
  }
}

/** Reprograma todos los trabajos futuros (se llama al abrir la app). */
export async function syncAllReminders() {
  try {
    if (!(await native())) return
    const { getJobs } = await import('@/services/jobs')
    const jobs = await getJobs({ from: new Date().toISOString() })
    for (const j of jobs) {
      await scheduleJobReminder(j)
    }
  } catch {
    // ignore
  }
}
