// Planes de mantenimiento recurrente por cliente. Se guardan en localStorage
// (mismo enfoque que los datos del negocio y la meta de ingresos), así funciona
// sin cambios en la base de datos. Limitación: es por dispositivo.

export interface MaintenanceRecord {
  clientId: string
  clientName: string
  months: number // cada cuántos meses toca el servicio
  lastService: string // fecha del último servicio (YYYY-MM-DD)
}

export type MaintenanceStatus = 'ok' | 'soon' | 'due'

const KEY = 'maintenance_plans'

export function getAllMaintenance(): MaintenanceRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as MaintenanceRecord[]
  } catch {
    // ignore
  }
  return []
}

export function getMaintenance(clientId: string): MaintenanceRecord | null {
  return getAllMaintenance().find((r) => r.clientId === clientId) || null
}

export function saveMaintenance(rec: MaintenanceRecord) {
  if (typeof window === 'undefined') return
  const all = getAllMaintenance().filter((r) => r.clientId !== rec.clientId)
  all.push(rec)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function removeMaintenance(clientId: string) {
  if (typeof window === 'undefined') return
  const all = getAllMaintenance().filter((r) => r.clientId !== clientId)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function nextDueDate(rec: MaintenanceRecord): Date {
  const d = new Date(rec.lastService)
  d.setMonth(d.getMonth() + rec.months)
  return d
}

export function maintenanceStatus(rec: MaintenanceRecord): MaintenanceStatus {
  const due = nextDueDate(rec)
  const now = new Date()
  const days = (due.getTime() - now.getTime()) / 86400000
  if (days < 0) return 'due'
  if (days <= 14) return 'soon'
  return 'ok'
}
