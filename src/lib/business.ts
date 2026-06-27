export interface BusinessInfo {
  name: string
  phone: string
  email: string
  /** Logo como data URL (data:image/png;base64,...) para incrustar en los PDFs. */
  logo?: string
}

const KEY = 'business_info'

const EMPTY: BusinessInfo = { name: '', phone: '', email: '', logo: '' }

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
