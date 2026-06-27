// Plantillas de trabajos guardadas localmente. Permiten crear rápido trabajos
// repetitivos (ej. "Mantenimiento mensual") sin volver a llenar todo.

export interface JobTemplate {
  id: string
  name: string
  data: {
    title: string
    description?: string
    address?: string
    category: string
    price: number
    payment_method?: string
    notes?: string
  }
}

const KEY = 'job_templates'

export function getTemplates(): JobTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as JobTemplate[]
  } catch {
    // ignore
  }
  return []
}

export function saveTemplate(name: string, data: JobTemplate['data']): JobTemplate {
  const template: JobTemplate = {
    id: `tpl_${Date.now()}`,
    name,
    data,
  }
  const all = getTemplates()
  all.push(template)
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(all))
  }
  return template
}

export function removeTemplate(id: string) {
  if (typeof window === 'undefined') return
  const all = getTemplates().filter((t) => t.id !== id)
  localStorage.setItem(KEY, JSON.stringify(all))
}
