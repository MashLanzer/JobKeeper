'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, CalendarCheck, CalendarClock, Navigation, Play, CheckCircle2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { categoryStyle } from '@/lib/categories'
import { updateJob, getJobs } from '@/services/jobs'
import { getPayments, addPayment } from '@/services/payments'
import { scheduleJobReminder } from '@/lib/local-notifications'
import { haptic } from '@/lib/haptics'
import Link from 'next/link'
import type { Job } from '@/types'

type CalFilter = 'todos' | 'pendientes' | 'sincobrar' | 'vencidos'

function passesFilter(job: Job, filter: CalFilter): boolean {
  if (filter === 'pendientes') return job.status === 'pendiente' || job.status === 'en_progreso'
  if (filter === 'sincobrar') return job.status === 'completado' && !job.paid_at
  if (filter === 'vencidos') return isOverdue(job)
  return true
}

const FILTER_CHIPS: { value: CalFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'sincobrar', label: 'Sin cobrar' },
  { value: 'vencidos', label: 'Vencidos' },
]

interface CalendarViewProps {
  jobs: Job[]
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
  onChanged?: () => void
}

const isOverdue = (job: Job) =>
  !!job.scheduled_at &&
  new Date(job.scheduled_at) < new Date() &&
  (job.status === 'pendiente' || job.status === 'en_progreso')

const byTime = (a: Job, b: Job) => {
  const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
  const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
  return ta - tb
}

const timeOf = (job: Job) =>
  job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null

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

export function CalendarView({ jobs, year, month, onMonthChange, onChanged }: CalendarViewProps) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [reschedJob, setReschedJob] = useState<Job | null>(null)
  const [reschedValue, setReschedValue] = useState('')
  const [reschedSaving, setReschedSaving] = useState(false)
  const [view, setView] = useState<'mes' | 'semana' | 'agenda'>('mes')
  const [colorBy, setColorBy] = useState<'estado' | 'categoria'>('estado')
  const [filter, setFilter] = useState<CalFilter>('todos')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [agendaJobs, setAgendaJobs] = useState<Job[]>([])
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [agendaRefresh, setAgendaRefresh] = useState(0)

  // Jobs visibles según el filtro rápido (aplica a mes/semana).
  const visibleJobs = useMemo(() => jobs.filter((j) => passesFilter(j, filter)), [jobs, filter])

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
    visibleJobs.forEach((job) => {
      const ds = job.scheduled_at || job.created_at
      if (!ds) return
      const k = dateKey(new Date(ds))
      if (!map[k]) map[k] = []
      map[k].push(job)
    })
    return map
  }, [visibleJobs])

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
    visibleJobs.forEach((job) => {
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
  }, [visibleJobs, year, month])

  const selectedDayJobs = (selectedDay ? jobsByDay[selectedDay] || [] : []).slice().sort(byTime)

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

  // Agenda un trabajo en una fecha concreta: prellena el formulario con la
  // fecha (09:00) y abre "Nuevo trabajo".
  const scheduleOnDay = (d: Date) => {
    const at = new Date(d)
    at.setHours(9, 0, 0, 0)
    sessionStorage.setItem('prefill_job', JSON.stringify({ scheduled_at: at.toISOString() }))
    router.push('/trabajos/nuevo')
  }

  // Vuelve al día de hoy (mes y semana) y lo selecciona.
  const goToday = () => {
    const t = new Date()
    onMonthChange(t.getFullYear(), t.getMonth() + 1)
    const ws = new Date(t)
    ws.setDate(t.getDate() - t.getDay())
    ws.setHours(0, 0, 0, 0)
    setWeekStart(ws)
    setSelectedDay(t.getDate())
  }

  const selectedDayTotal = selectedDayJobs.reduce((s, j) => s + Number(j.price), 0)

  // Reagendar: abre el diálogo con la fecha actual del trabajo precargada.
  const openReschedule = (job: Job) => {
    const base = job.scheduled_at ? new Date(job.scheduled_at) : new Date()
    // Formato datetime-local (sin segundos ni zona).
    const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setReschedValue(local)
    setReschedJob(job)
  }

  const handleReschedule = async () => {
    if (!reschedJob || !reschedValue) return
    setReschedSaving(true)
    try {
      const iso = new Date(reschedValue).toISOString()
      await updateJob(reschedJob.id, { scheduled_at: iso })
      scheduleJobReminder({ id: reschedJob.id, title: reschedJob.title, scheduled_at: iso })
      toast.success('Trabajo reagendado')
      setReschedJob(null)
      onChanged?.()
    } catch {
      toast.error('No se pudo reagendar')
    } finally {
      setReschedSaving(false)
    }
  }

  // Abre las direcciones de los trabajos del día como ruta en Google Maps.
  const openDayRoute = () => {
    const addresses = selectedDayJobs.filter((j) => j.address).map((j) => j.address as string)
    if (!addresses.length) return
    window.open(
      `https://www.google.com/maps/dir/${addresses.map((a) => encodeURIComponent(a)).join('/')}`,
      '_blank'
    )
  }

  // Refresca tanto el mes (página) como la vista Agenda.
  const refreshAll = () => {
    onChanged?.()
    setAgendaRefresh((x) => x + 1)
  }

  // Vista Agenda: carga próximos trabajos (de hoy en adelante) bajo demanda.
  useEffect(() => {
    if (view !== 'agenda') return
    setAgendaLoading(true)
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    getJobs({ from: from.toISOString() })
      .then((js) => setAgendaJobs(js.filter((j) => j.scheduled_at).sort(byTime)))
      .catch(() => setAgendaJobs([]))
      .finally(() => setAgendaLoading(false))
  }, [view, agendaRefresh])

  // Acciones rápidas de estado/cobro desde el calendario (sin abrir el detalle).
  const startJob = async (job: Job) => {
    setActionBusy(job.id)
    try {
      await updateJob(job.id, { status: 'en_progreso' })
      haptic('medium')
      toast.success('Trabajo iniciado')
      refreshAll()
    } catch {
      toast.error('No se pudo actualizar')
    } finally {
      setActionBusy(null)
    }
  }

  const completeJob = async (job: Job) => {
    setActionBusy(job.id)
    try {
      await updateJob(job.id, { status: 'completado', completed_at: job.completed_at || new Date().toISOString() })
      haptic('success')
      toast.success('Trabajo completado')
      refreshAll()
    } catch {
      toast.error('No se pudo actualizar')
    } finally {
      setActionBusy(null)
    }
  }

  const collectJob = async (job: Job) => {
    setActionBusy(job.id)
    try {
      const pays = await getPayments(job.id).catch(() => [])
      const collected = Number(job.deposit) + pays.reduce((s, p) => s + Number(p.amount), 0)
      const pending = Number(job.price) - collected
      if (pending > 0) {
        await addPayment({ job_id: job.id, amount: pending, method: job.payment_method || 'efectivo' })
      }
      await updateJob(job.id, { paid_at: new Date().toISOString() })
      haptic('success')
      toast.success('Trabajo cobrado')
      refreshAll()
    } catch {
      toast.error('No se pudo cobrar')
    } finally {
      setActionBusy(null)
    }
  }

  // Resumen del periodo (sobre lo visible según filtro).
  const monthSummary = useMemo(() => {
    const total = visibleJobs.reduce((s, j) => s + Number(j.price), 0)
    const paid = visibleJobs.filter((j) => j.paid_at).length
    return { count: visibleJobs.length, total, paid }
  }, [visibleJobs])

  const weekSummary = useMemo(() => {
    const wj = weekDays.flatMap((d) => jobsByDate[dateKey(d)] || [])
    return { count: wj.length, total: wj.reduce((s, j) => s + Number(j.price), 0) }
  }, [weekDays, jobsByDate])

  // Agenda: próximos trabajos agrupados por día (respeta el filtro).
  const agendaGroups = useMemo(() => {
    const map: Record<string, Job[]> = {}
    agendaJobs
      .filter((j) => passesFilter(j, filter))
      .forEach((j) => {
        const k = dateKey(new Date(j.scheduled_at as string))
        if (!map[k]) map[k] = []
        map[k].push(j)
      })
    return Object.keys(map)
      .sort()
      .map((k) => ({ key: k, jobs: map[k] }))
  }, [agendaJobs, filter])

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
        {(['mes', 'semana', 'agenda'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'flex-1 text-sm font-medium py-1.5 rounded-md transition-colors capitalize',
              view === v
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
              filter === c.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Hoy + color toggle (no aplica a la vista Agenda) */}
      {view !== 'agenda' && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={goToday}>
            <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
            Hoy
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color por:</span>
            <button
              onClick={() => setColorBy((v) => (v === 'estado' ? 'categoria' : 'estado'))}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors capitalize"
            >
              {colorBy}
            </button>
          </div>
        </div>
      )}

      {view === 'agenda' ? (
        <div className="space-y-4">
          {agendaLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Cargando…</p>
          ) : agendaGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay trabajos próximos</p>
          ) : (
            agendaGroups.map((g) => {
              const d = new Date(g.jobs[0].scheduled_at as string)
              const isToday = dateKey(d) === dateKey(today)
              const dayTotal = g.jobs.reduce((s, j) => s + Number(j.price), 0)
              return (
                <div key={g.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                      {isToday ? 'Hoy · ' : ''}
                      {DAYS_OF_WEEK[d.getDay()]} {d.getDate()} {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                    </h3>
                    <span className="text-xs font-medium text-money">{formatCurrency(dayTotal)}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {g.jobs.map((job) => (
                      <Link key={job.id} href={`/trabajos/${job.id}`} className="block">
                        <Card className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', dotColor(job))} />
                              {timeOf(job) && (
                                <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{timeOf(job)}</span>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{job.title}</p>
                                {job.client?.name && (
                                  <p className="text-xs text-muted-foreground truncate">{job.client.name}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-money flex-shrink-0">
                              {formatCurrency(job.price)}
                            </span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : view === 'semana' ? (
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

          {weekSummary.count > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {weekSummary.count} trabajo{weekSummary.count !== 1 ? 's' : ''} · {formatCurrency(weekSummary.total)}
            </p>
          )}

          {/* Week day rows */}
          <div className="space-y-2">
            {weekDays.map((d) => {
              const dayJobs = (jobsByDate[dateKey(d)] || []).slice().sort(byTime)
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
                    <div className="flex items-center gap-2">
                      {dayJobs.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {dayJobs.length} trabajo{dayJobs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => scheduleOnDay(d)}
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Agendar este día"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
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
                            {timeOf(job) && (
                              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{timeOf(job)}</span>
                            )}
                            <span className="truncate">
                              {job.title}
                              {job.client?.name ? <span className="text-muted-foreground"> · {job.client.name}</span> : null}
                            </span>
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

      {monthSummary.count > 0 && (
        <p className="text-center text-xs text-muted-foreground -mt-2">
          {monthSummary.count} trabajo{monthSummary.count !== 1 ? 's' : ''} · {formatCurrency(monthSummary.total)} agendado · {monthSummary.paid} cobrado{monthSummary.paid !== 1 ? 's' : ''}
        </p>
      )}

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
            const hasOverdue = dayJobs.some(isOverdue)

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-start pt-1 rounded-lg transition-colors relative hover:bg-muted',
                  isToday && 'border-2 border-primary',
                  isSelected && 'bg-primary/10',
                  !hasJobs && !isSelected && 'text-muted-foreground'
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
                  <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                    {dayJobs.slice(0, 3).map((job, i) => (
                      <span
                        key={i}
                        className={cn('block h-1.5 w-1.5 rounded-full', dotColor(job))}
                      />
                    ))}
                    {dayJobs.length > 3 && (
                      <span className="text-[8px] leading-none text-muted-foreground font-medium">
                        +{dayJobs.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {hasOverdue && (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day jobs */}
      {selectedDay && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground">
              {selectedDay} de {MONTH_NAMES[month - 1]}
            </h3>
            {selectedDayTotal > 0 && (
              <span className="text-xs font-medium text-money">{formatCurrency(selectedDayTotal)}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => scheduleOnDay(new Date(year, month - 1, selectedDay))}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agendar este día
            </Button>
            {selectedDayJobs.some((j) => j.address) && (
              <Button variant="outline" size="sm" onClick={openDayRoute} aria-label="Ruta del día">
                <Navigation className="h-4 w-4 mr-1.5" />
                Ruta
              </Button>
            )}
          </div>

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
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 -ml-1 text-xs text-muted-foreground"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openReschedule(job)
                          }}
                        >
                          <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                          Reagendar
                        </Button>

                        {job.status === 'pendiente' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={actionBusy === job.id}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); startJob(job) }}
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Iniciar
                          </Button>
                        )}
                        {job.status === 'en_progreso' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={actionBusy === job.id}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); completeJob(job) }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Completar
                          </Button>
                        )}
                        {job.status === 'completado' && !job.paid_at && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                            disabled={actionBusy === job.id}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); collectJob(job) }}
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                            Cobrar
                          </Button>
                        )}
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

      {/* Reagendar trabajo */}
      <Dialog open={!!reschedJob} onOpenChange={(o) => !o && setReschedJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar trabajo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {reschedJob && (
              <p className="text-sm text-muted-foreground truncate">{reschedJob.title}</p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Nueva fecha y hora</Label>
              <Input
                type="datetime-local"
                value={reschedValue}
                onChange={(e) => setReschedValue(e.target.value)}
                disabled={reschedSaving}
              />
            </div>
            <Button onClick={handleReschedule} className="w-full" disabled={reschedSaving || !reschedValue}>
              {reschedSaving ? 'Guardando…' : 'Guardar nueva fecha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
