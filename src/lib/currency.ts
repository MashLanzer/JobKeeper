// Moneda configurable. Se guarda en localStorage y `formatCurrency` la usa.
// (síncrono para poder usarse en los PDF y en render).

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'USD — Dólar' },
  { code: 'MXN', label: 'MXN — Peso mexicano' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'COP', label: 'COP — Peso colombiano' },
  { code: 'GTQ', label: 'GTQ — Quetzal' },
  { code: 'DOP', label: 'DOP — Peso dominicano' },
  { code: 'ARS', label: 'ARS — Peso argentino' },
  { code: 'CLP', label: 'CLP — Peso chileno' },
  { code: 'PEN', label: 'PEN — Sol' },
]

let cached: string | null = null

export function getCurrency(): string {
  if (cached === null) {
    cached = (typeof window !== 'undefined' && localStorage.getItem('currency')) || 'USD'
  }
  return cached
}

export function setCurrency(code: string) {
  cached = code
  if (typeof window !== 'undefined') localStorage.setItem('currency', code)
}
