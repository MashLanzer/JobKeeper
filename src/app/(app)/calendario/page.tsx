'use client'

import { useState } from 'react'
import { CalendarView, type MaintenanceEvent } from '@/components/calendar/calendar-view'
import { PageHeader } from '@/components/shared/page-header'
import { getJobsByMonth } from '@/services/jobs'
import { getClients } from '@/services/clients'
import { hasMaintenance, nextDueDate } from '@/lib/maintenance'
import { useEffect } from 'react'
import type { Job } from '@/types'

export default function CalendarioPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [jobs, setJobs] = useState<Job[]>([])
  const [maintenances, setMaintenances] = useState<MaintenanceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true)
        const data = await getJobsByMonth(year, month)
        setJobs(data)
      } catch (err) {
        console.error('Error loading calendar jobs:', err)
      } finally {
        setLoading(false)
      }
    }

    loadJobs()
  }, [year, month, refreshKey])

  // Mantenimientos cuyo próximo servicio cae en el mes mostrado.
  useEffect(() => {
    getClients()
      .then((clients) => {
        const events: MaintenanceEvent[] = []
        for (const c of clients) {
          if (!hasMaintenance(c)) continue
          const due = nextDueDate(c.last_service_date as string, c.maintenance_months as number)
          if (due.getFullYear() === year && due.getMonth() + 1 === month) {
            events.push({ id: c.id, name: c.name || 'Cliente', date: due.toISOString() })
          }
        }
        setMaintenances(events)
      })
      .catch(() => setMaintenances([]))
  }, [year, month])

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
  }

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Calendario"
        description={`${jobs.length} trabajo${jobs.length !== 1 ? 's' : ''} este mes`}
      />

      <CalendarView
        jobs={jobs}
        maintenances={maintenances}
        year={year}
        month={month}
        onMonthChange={handleMonthChange}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
