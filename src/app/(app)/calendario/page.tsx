'use client'

import { useState } from 'react'
import { CalendarView } from '@/components/calendar/calendar-view'
import { PageHeader } from '@/components/shared/page-header'
import { getJobsByMonth } from '@/services/jobs'
import { useEffect } from 'react'
import type { Job } from '@/types'

export default function CalendarioPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [year, month])

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
  }

  return (
    <div className="space-y-5 page-transition">
      <PageHeader
        title="Calendario"
        description={`${jobs.length} trabajo${jobs.length !== 1 ? 's' : ''} este mes`}
      />

      <CalendarView
        jobs={jobs}
        year={year}
        month={month}
        onMonthChange={handleMonthChange}
      />
    </div>
  )
}
