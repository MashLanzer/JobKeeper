// Resumen de "necesita atención": lo accionable de un vistazo.
// Reutilizado por el hub (Más) y el indicador de la barra inferior.

import { getPendingBalance, getFollowupsDue } from '@/services/jobs'
import { getMaterials } from '@/services/materials'
import { getClients } from '@/services/clients'
import { hasMaintenance, maintenanceStatus } from '@/lib/maintenance'

export interface AttentionSummary {
  pending: number
  maintDue: number
  followupCount: number
  lowCount: number
  /** Número de categorías con algo pendiente (0-4). */
  count: number
}

export async function getAttentionSummary(): Promise<AttentionSummary> {
  const [pending, materials, clients, followups] = await Promise.all([
    getPendingBalance().catch(() => 0),
    getMaterials().catch(() => []),
    getClients().catch(() => []),
    getFollowupsDue().catch(() => []),
  ])

  const lowCount = materials.filter(
    (m) => Number(m.stock) <= Number(m.min_stock) && Number(m.min_stock) > 0
  ).length

  const maintDue = clients.filter(
    (c) =>
      hasMaintenance(c) &&
      maintenanceStatus(c.last_service_date as string, c.maintenance_months as number) === 'due'
  ).length

  const followupCount = followups.length

  const count =
    (pending > 0 ? 1 : 0) +
    (maintDue > 0 ? 1 : 0) +
    (followupCount > 0 ? 1 : 0) +
    (lowCount > 0 ? 1 : 0)

  return { pending, maintDue, followupCount, lowCount, count }
}
