// Helpers del checklist de servicio. Los datos viven en la columna `checklist`
// (JSONB) de la tabla `jobs`.

import type { ChecklistItem } from '@/types'

export type { ChecklistItem }

export const DEFAULT_TASKS = [
  'Revisar nivel de gas refrigerante',
  'Limpiar filtros',
  'Limpiar serpentines',
  'Medir presiones',
  'Revisar drenaje',
  'Verificar termostato',
  'Revisar conexiones eléctricas',
]

/** Devuelve el checklist guardado del trabajo, o el predeterminado sin marcar. */
export function buildChecklist(saved?: ChecklistItem[] | null): ChecklistItem[] {
  if (saved && saved.length) return saved
  return DEFAULT_TASKS.map((label) => ({ label, done: false }))
}
