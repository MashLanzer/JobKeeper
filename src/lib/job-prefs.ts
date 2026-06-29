// Recuerda el último precio usado por categoría para prellenar trabajos nuevos.
// Es solo una comodidad local (localStorage); no afecta datos en la nube.

const KEY = 'last_price_by_category'

function readMap(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function getLastPrice(category: string): number {
  const v = readMap()[category]
  return typeof v === 'number' && v > 0 ? v : 0
}

export function setLastPrice(category: string, price: number) {
  if (typeof window === 'undefined' || !category || !(price > 0)) return
  try {
    const map = readMap()
    map[category] = price
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}
