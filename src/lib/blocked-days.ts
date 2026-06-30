// Días marcados como no disponibles (descanso/vacaciones). Solo local.
// Se guardan como claves 'YYYY-MM-DD'.

const KEY = 'blocked_days'

export function getBlockedDays(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function toggleBlockedDay(key: string): string[] {
  const set = new Set(getBlockedDays())
  if (set.has(key)) set.delete(key)
  else set.add(key)
  const next = Array.from(set)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}
