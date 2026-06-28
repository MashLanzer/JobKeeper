'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { categoryStyle } from '@/lib/categories'
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

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function CalendarView({ jobs, year, month, onMonthChange }: CalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [view, setView] = useState<'mes' | 'semana'>('mes')
  const [colorBy, setColorBy] = useState<'estado' | 'categoria'>('estado')

  const dotColor = (job: Job) =>
    colorBy === 'categoria' ? categoryStyle(job.category).dot : STATUS_COLORS[job.status] || 'bg-primary'

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay()) // retrocede al domingo
    d.setHours(0, 0, 0, 0)
    return d
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {}
    jobs.forEach((job) => {
      const ds = job.scheduled_at || job.created_at
      if (!ds) return
      const k = dateKey(new Date(ds))
      if (!map[k]) map[k] = []
      map[k].push(job)
    })
    return map
  }, [jobs])

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      }),
    [weekStart]
  )

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d)
    const mid = new Date(d)
    mid.setDate(mid.getDate() + 3)
    if (mid.getFullYear() !== year || mid.getMonth() + 1 !== month) {
      onMonthChange(mid.getFullYear(), mid.getMonth() + 1)
    }
  }

  const jobsByDay = useMemo(() => {
    const map: Record<number, Job[]> = {}
    jobs.forEach((job) => {
      // Usa la fecha programada, o la de creación como respaldo, para que
      // todos los trabajos aparezcan marcados en el calendario.
      const dateStr = job.scheduled_at || job.created_at
      if (dateStr) {
        const d = new Date(dateStr)
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const day = d.getDate()
          if (!map[day]) map[day] = []
          map[day].push(job)
        }
      }
    })
    return map
  }, [jobs, year, month])

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
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => setView('mes')}
          className={cn(
            'flex-1 text-sm font-medium py-1.5 rounded-md transition-colors',
            view === 'mes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Mes
        </button>
        <button
          onClick={() => setView('semana')}
          className={cn(
            'flex-1 text-sm font-medium py-1.5 rounded-md transition-colors',
            view === 'semana'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Semana
        </button>
      </div>

      {/* Color toggle */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Color por:</span>
        <button
          onClick={() => setColorBy((v) => (v === 'estado' ? 'categoria' : 'estado'))}
          className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors capitalize"
        >
          {colorBy}
        </button>
      </div>

      {view === 'semana' ? (
        <div className="space-y-3">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => shiftWeek(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-semibold text-center">
              {weekDays[0].getDate()} {MONTH_NAMES[weekDays[0].getMonth()].slice(0, 3)} —{' '}
              {weekDays[6].getDate()} {MONTH_NAMES[weekDays[6].getMonth()].slice(0, 3)}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => shiftWeek(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Week day rows */}
          <div className="space-y-2">
            {weekDays.map((d) => {
              const dayJobs = jobsByDate[dateKey(d)] || []
              const isToday = dateKey(d) === dateKey(today)
              return (
                <div
                  key={dateKey(d)}
                  className={cn(
                    'rounded-xl border p-3',
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                      {DAYS_OF_WEEK[d.getDay()]} {d.getDate()}
                    </span>
                    {dayJobs.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {dayJobs.length} trabajo{dayJobs.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {dayJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin trabajos</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayJobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/trabajos/${job.id}`}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn('h-2 w-2 rounded-full flex-shrink-0', dotColor(job))}
                            />
                            <span className="truncate">{job.title}</span>
                          </div>
                          <span className="text-xs font-medium text-money flex-shrink-0">
                            {formatCurrency(job.price)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

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
      ) : (
      <>
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
                        className={cn('block h-1.5 w-1.5 rounded-full', dotColor(job))}
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
            <div className="flex flex-col gap-3">
              {selectedDayJobs.map((job) => (
                <Link key={job.id} href={`/trabajos/${job.id}`} className="block">
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
                          <p className="text-xs text-muted-foreground">
                            {job.scheduled_at
                              ? new Date(job.scheduled_at).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Sin hora programada'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-money">
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
        {colorBy === 'estado' ? (
          Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
              <span className="text-xs text-muted-foreground capitalize">
                {status === 'en_progreso' ? 'En progreso' : status}
              </span>
            </div>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Puntos coloreados por categoría</span>
        )}
      </div>
      </>
      )}
    </div>
  )
}
