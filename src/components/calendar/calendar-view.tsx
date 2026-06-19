'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Job } from '@/types'

interface CalendarViewProps {
  jobs: Job[]
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-500',
  en_progreso: 'bg-blue-500',
  completado: 'bg-green-500',
  cancelado: 'bg-red-500',
}

export function CalendarView({ jobs, year, month, onMonthChange }: CalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

  const jobsByDay = useMemo(() => {
    const map: Record<number, Job[]> = {}
    jobs.forEach((job) => {
      if (job.scheduled_at) {
        const d = new Date(job.scheduled_at)
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(job)
      }
    })
    return map
  }, [jobs])

  const selectedDayJobs = selectedDay ? jobsByDay[selectedDay] || [] : []

  const prevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12)
    } else {
      onMonthChange(year, month - 1)
    }
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1)
    } else {
      onMonthChange(year, month + 1)
    }
    setSelectedDay(null)
  }

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d)
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="aspect-square" />
            }

            const dayJobs = jobsByDay[day] || []
            const isToday = isCurrentMonth && today.getDate() === day
            const isSelected = selectedDay === day
            const hasJobs = dayJobs.length > 0

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-start pt-1 rounded-lg transition-colors relative',
                  isToday && 'border-2 border-primary',
                  isSelected && 'bg-primary/10',
                  hasJobs && !isSelected && 'hover:bg-muted',
                  !hasJobs && 'cursor-default opacity-60'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium leading-none',
                    isToday && 'text-primary font-bold',
                    isSelected && 'text-primary'
                  )}
                >
                  {day}
                </span>
                {hasJobs && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {dayJobs.slice(0, 3).map((job, i) => (
                      <span
                        key={i}
                        className={cn(
                          'block h-1.5 w-1.5 rounded-full',
                          STATUS_COLORS[job.status] || 'bg-primary'
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day jobs */}
      {selectedDay && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">
            {selectedDay} de {MONTH_NAMES[month - 1]}
          </h3>

          {selectedDayJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin trabajos este día</p>
          ) : (
            <div className="space-y-2">
              {selectedDayJobs.map((job) => (
                <Link key={job.id} href={`/trabajos/${job.id}`}>
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{job.title}</h4>
                            <JobStatusBadge status={job.status} />
                          </div>
                          {job.client && (
                            <p className="text-xs text-muted-foreground mt-0.5">{job.client.name}</p>
                          )}
                          {job.scheduled_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.scheduled_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-green-500">
                          {formatCurrency(job.price)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
            <span className="text-xs text-muted-foreground capitalize">
              {status === 'en_progreso' ? 'En progreso' : status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
