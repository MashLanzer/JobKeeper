'use client'

import { useEffect, useState } from 'react'
import { getClients } from '@/services/clients'
import { getFollowupsDue, getPendingBalance } from '@/services/jobs'
import { hasMaintenance, maintenanceStatus, nextDueDate } from '@/lib/maintenance'
import { formatCurrency, formatDate } from '@/lib/utils'

export type AlertType = 'info' | 'warning' | 'success' | 'error'

export interface Alert {
  id: string
  title: string
  message: string
  type: AlertType
  href: string
}

/** Calcula avisos en vivo a partir de los datos (mantenimiento, seguimientos, cobros). */
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const load = async () => {
      const result: Alert[] = []
      try {
        const [clients, followups, pending] = await Promise.all([
          getClients().catch(() => []),
          getFollowupsDue().catch(() => []),
          getPendingBalance().catch(() => 0),
        ])

        // Mantenimientos vencidos / próximos
        clients
          .filter((c) => hasMaintenance(c) && maintenanceStatus(c.last_service_date as string, c.maintenance_months as number) !== 'ok')
          .forEach((c) => {
            const overdue = maintenanceStatus(c.last_service_date as string, c.maintenance_months as number) === 'due'
            result.push({
              id: `maint-${c.id}`,
              type: overdue ? 'warning' : 'info',
              title: overdue ? 'Mantenimiento vencido' : 'Mantenimiento próximo',
              message: `${c.name} · ${formatDate(nextDueDate(c.last_service_date as string, c.maintenance_months as number).toISOString())}`,
              href: `/clientes/${c.id}`,
            })
          })

        // Seguimientos pendientes
        followups.forEach((j) => {
          result.push({
            id: `follow-${j.id}`,
            type: 'info',
            title: 'Seguimiento pendiente',
            message: j.title,
            href: `/trabajos/${j.id}`,
          })
        })

        // Cobros pendientes
        if (pending > 0) {
          result.push({
            id: 'pending-balance',
            type: 'warning',
            title: 'Cobros pendientes',
            message: `Tienes ${formatCurrency(pending)} por cobrar`,
            href: '/cobranza',
          })
        }
      } catch {
        // ignore
      }
      setAlerts(result)
    }
    load()
  }, [])

  return { alerts }
}
