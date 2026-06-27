// Folios consecutivos para recibos y cotizaciones. Se guardan en localStorage
// (un contador por tipo de documento). Formato: #001, #002, ...

type FolioType = 'recibo' | 'cotizacion'

function key(type: FolioType): string {
  return `folio_${type}`
}

/** Devuelve el siguiente folio (incrementa y persiste). Ej: "001". */
export function nextFolio(type: FolioType): string {
  if (typeof window === 'undefined') return '001'
  let n = 0
  try {
    n = Number(localStorage.getItem(key(type))) || 0
  } catch {
    n = 0
  }
  n += 1
  try {
    localStorage.setItem(key(type), String(n))
  } catch {
    // ignore
  }
  return String(n).padStart(3, '0')
}
