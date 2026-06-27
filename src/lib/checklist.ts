// Checklist de servicio por trabajo. Se guarda en localStorage (sin base de
// datos). Útil para A/C: dejar constancia de las tareas realizadas y que
// aparezcan en el recibo.

export interface ChecklistItem {
  label: string
  done: boolean
}

const KEY = 'job_checklists'

export const DEFAULT_TASKS = [
  'Revisar nivel de gas refrigerante',
  'Limpiar filtros',
  'Limpiar serpentines',
  'Medir presiones',
  'Revisar drenaje',
  'Verificar termostato',
  'Revisar conexiones eléctricas',
]

type Store = Record<string, ChecklistItem[]>

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

/** Devuelve el checklist guardado del trabajo, o el predeterminado sin marcar. */
export function getChecklist(jobId: string): ChecklistItem[] {
  const saved = readStore()[jobId]
  if (saved && saved.length) return saved
  return DEFAULT_TASKS.map((label) => ({ label, done: false }))
}

export function saveChecklist(jobId: string, items: ChecklistItem[]) {
  if (typeof window === 'undefined') return
  const store = readStore()
  store[jobId] = items
  localStorage.setItem(KEY, JSON.stringify(store))
}

/** Indica si el trabajo tiene un checklist guardado (con al menos una tarea marcada). */
export function hasChecklist(jobId: string): boolean {
  const saved = readStore()[jobId]
  return !!saved && saved.some((i) => i.done)
}
