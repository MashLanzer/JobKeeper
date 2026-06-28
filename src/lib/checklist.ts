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

// Listas de tareas según el tipo de trabajo.
const TASKS_BY_CATEGORY: Record<string, string[]> = {
  'A/C - Instalación': [
    'Verificar voltaje y breaker',
    'Montar y nivelar unidad',
    'Conectar líneas de refrigerante',
    'Hacer vacío al sistema',
    'Carga de gas',
    'Prueba de drenaje',
    'Prueba de funcionamiento',
  ],
  'A/C - Mantenimiento': DEFAULT_TASKS,
  'A/C - Reparación': [
    'Diagnóstico de la falla',
    'Revisar componente afectado',
    'Medir presiones',
    'Detectar fugas',
    'Reparar / reemplazar',
    'Prueba de funcionamiento',
  ],
  'A/C - Limpieza': [
    'Limpiar filtros',
    'Limpiar serpentín evaporador',
    'Limpiar serpentín condensador',
    'Limpiar charola y drenaje',
    'Desinfectar',
  ],
}

/** Devuelve el checklist guardado del trabajo, o el predeterminado según la categoría. */
export function buildChecklist(saved?: ChecklistItem[] | null, category?: string): ChecklistItem[] {
  if (saved && saved.length) return saved
  const tasks = (category && TASKS_BY_CATEGORY[category]) || DEFAULT_TASKS
  return tasks.map((label) => ({ label, done: false }))
}
