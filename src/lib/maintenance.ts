// Helpers para el plan de mantenimiento recurrente. Los datos viven en la tabla
// `clients` (maintenance_months, last_service_date); estas funciones solo
// calculan el próximo servicio y su estado.

export type MaintenanceStatus = 'ok' | 'soon' | 'due'

export function nextDueDate(lastService: string, months: number): Date {
  const d = new Date(lastService)
  d.setMonth(d.getMonth() + months)
  return d
}

export function maintenanceStatus(lastService: string, months: number): MaintenanceStatus {
  const due = nextDueDate(lastService, months)
  const days = (due.getTime() - Date.now()) / 86400000
  if (days < 0) return 'due'
  if (days <= 14) return 'soon'
  return 'ok'
}

/** ¿El cliente tiene un plan de mantenimiento configurado? */
export function hasMaintenance(c: {
  maintenance_months?: number | null
  last_service_date?: string | null
}): boolean {
  return !!c.maintenance_months && c.maintenance_months > 0 && !!c.last_service_date
}
