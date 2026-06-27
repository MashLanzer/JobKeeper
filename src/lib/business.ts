export interface BusinessInfo {
  name: string
  phone: string
  email: string
}

const KEY = 'business_info'

const EMPTY: BusinessInfo = { name: '', phone: '', email: '' }

export function getBusinessInfo(): BusinessInfo {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    // ignore malformed data
  }
  return { ...EMPTY }
}

export function saveBusinessInfo(info: BusinessInfo) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(info))
}

/** Nombre a mostrar en los PDFs (cae a "WorkLedger" si no se configuró). */
export function getBusinessName(): string {
  return getBusinessInfo().name.trim() || 'WorkLedger'
}
