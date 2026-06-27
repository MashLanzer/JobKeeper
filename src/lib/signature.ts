// Firma del cliente por trabajo, guardada como data URL en localStorage.
// Se incrusta en el recibo PDF como comprobante de conformidad.

const KEY = 'job_signatures'

type Store = Record<string, string>

function readStore(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // ignore
  }
  return {}
}

export function getSignature(jobId: string): string | null {
  return readStore()[jobId] || null
}

export function saveSignature(jobId: string, dataUrl: string) {
  if (typeof window === 'undefined') return
  const store = readStore()
  store[jobId] = dataUrl
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function removeSignature(jobId: string) {
  if (typeof window === 'undefined') return
  const store = readStore()
  delete store[jobId]
  localStorage.setItem(KEY, JSON.stringify(store))
}
