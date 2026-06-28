// Qué secciones incluir en el recibo PDF. Se guarda en localStorage.

export interface PdfPrefs {
  photos: boolean
  checklist: boolean
  signature: boolean
}

const KEY = 'pdf_prefs'
const DEFAULTS: PdfPrefs = { photos: true, checklist: true, signature: true }

export function getPdfPrefs(): PdfPrefs {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return { ...DEFAULTS }
}

export function setPdfPrefs(prefs: PdfPrefs) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
