// Color de acento (variable --primary / --ring). Se guarda en localStorage y se
// aplica al documento. El valor por defecto coincide con globals.css (índigo).

export interface Accent {
  id: string
  label: string
  hsl: string // formato "H S% L%" (igual que las variables CSS)
}

export const ACCENTS: Accent[] = [
  { id: 'indigo', label: 'Índigo', hsl: '239 84% 67%' },
  { id: 'blue', label: 'Azul', hsl: '217 91% 60%' },
  { id: 'teal', label: 'Turquesa', hsl: '173 80% 40%' },
  { id: 'emerald', label: 'Verde', hsl: '160 84% 39%' },
  { id: 'orange', label: 'Naranja', hsl: '25 95% 53%' },
  { id: 'rose', label: 'Rosa', hsl: '347 77% 50%' },
  { id: 'violet', label: 'Violeta', hsl: '262 83% 58%' },
]

const KEY = 'accent'

export function getAccent(): string {
  if (typeof window === 'undefined') return 'indigo'
  return localStorage.getItem(KEY) || 'indigo'
}

export function applyAccent(id?: string) {
  if (typeof document === 'undefined') return
  const accent = ACCENTS.find((a) => a.id === (id || getAccent())) || ACCENTS[0]
  document.documentElement.style.setProperty('--primary', accent.hsl)
  document.documentElement.style.setProperty('--ring', accent.hsl)
}

export function setAccent(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, id)
  applyAccent(id)
}
