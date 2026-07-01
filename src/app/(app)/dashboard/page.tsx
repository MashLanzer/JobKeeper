'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DollarSign, Briefcase, Clock, TrendingDown, Plus, ListTodo, AlertCircle, CalendarDays, Wrench, Navigation, CheckCircle2, Users, Receipt, Wallet, Calculator, Search, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatCard } from '@/components/dashboard/stat-card'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { DashboardSkeleton } from '@/components/shared/loading-skeleton'
import { getDashboardStats, getPendingBalance, getTodayJobs, getTomorrowJobs, getFollowupsDue, getWeekStats } from '@/services/jobs'
import { updateJob } from '@/services/jobs'
import { getFinanceSummary } from '@/services/expenses'
import { getSettings } from '@/services/settings'
import { formatCurrency, formatDate } from '@/lib/utils'
import { nextDueDate, maintenanceStatus, hasMaintenance } from '@/lib/maintenance'
import { getClients } from '@/services/clients'
import { useAuth } from '@/hooks/use-auth'
import type { Job, Client } from '@/types'

interface Stats {
  completedThisMonth: number
  pendingJobs: number
  revenueThisMonth: number
  expensesThisMonth: number
  netProfitThisMonth: number
  upcomingJobs: any[]
  pendingBalance: number
  completedUnpaid: number
}

// Catálogo de accesos rápidos que el usuario puede elegir para el inicio.
const QUICK_ACTIONS: { id: string; label: string; href: string; icon: LucideIcon }[] = [
  { id: 'nuevo_trabajo', label: 'Nuevo trabajo', href: '/trabajos/nuevo', icon: Plus },
  { id: 'pendientes', label: 'Pendientes', href: '/trabajos?status=pendiente', icon: ListTodo },
  { id: 'nuevo_cliente', label: 'Nuevo cliente', href: '/clientes/nuevo', icon: Users },
  { id: 'nuevo_gasto', label: 'Nuevo gasto', href: '/gastos/nuevo', icon: Receipt },
  { id: 'cobranza', label: 'Cobranza', href: '/cobranza', icon: Wallet },
  { id: 'calculadora', label: 'Calculadora', href: '/calculadora', icon: Calculator },
  { id: 'buscar', label: 'Buscar', href: '/buscar', icon: Search },
  { id: 'calendario', label: 'Calendario', href: '/calendario', icon: CalendarDays },
]
const QUICK_BY_ID = Object.fromEntries(QUICK_ACTIONS.map((a) => [a.id, a]))
const DEFAULT_QUICK = ['nuevo_trabajo', 'pendientes']
const MAX_QUICK = 4

function getGreeting(user: { email?: string | null; user_metadata?: Record<string, string> } | null) {
  const hour = new Date().getHours()
  const prefix = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name
  if (fullName) return `${prefix}, ${fullName.split(' ')[0]}`

  const email = user?.email || ''
  const local = email.split('@')[0].replace(/[0-9]/g, '').split(/[._-]/)[0]
  if (local) {
    const name = local.charAt(0).toUpperCase() + local.slice(1)
    return `${prefix}, ${name}`
  }

  return prefix
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const openTodayRoute = () => {
    const addresses = todayJobs.filter((j) => j.address).map((j) => j.address as string)
    if (!addresses.length) return
    const url = `https://www.google.com/maps/dir/${addresses.map((a) => encodeURIComponent(a)).join('/')}`
    window.open(url, '_blank')
  }

  const scheduleMaintenance = (c: Client) => {
    const data = {
      title: 'Mantenimiento A/C',
      description: '',
      address: c.address || '',
      category: 'A/C - Mantenimiento',
      client_id: c.id,
      price: 0,
      deposit: 0,
      status: 'pendiente',
      payment_method: '',
      notes: '',
    }
    sessionStorage.setItem('prefill_job', JSON.stringify(data))
    router.push('/trabajos/nuevo')
  }
  const [stats, setStats] = useState<Stats | null>(null)
  const [todayJobs, setTodayJobs] = useState<Job[]>([])
  const [tomorrowJobs, setTomorrowJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [incomeGoal, setIncomeGoal] = useState(0)
  const [prevRevenue, setPrevRevenue] = useState<number | null>(null)
  const [weekStats, setWeekStats] = useState<{ income: number; count: number } | null>(null)
  const [dueMaintenance, setDueMaintenance] = useState<Client[]>([])
  const [followups, setFollowups] = useState<Job[]>([])
  const [quickIds, setQuickIds] = useState<string[]>(DEFAULT_QUICK)
  const [editQuick, setEditQuick] = useState(false)

  useEffect(() => {
    getFollowupsDue().then(setFollowups).catch(() => {})
    getWeekStats().then(setWeekStats).catch(() => {})
    try {
      const saved = JSON.parse(localStorage.getItem('dash_quick_actions') || 'null')
      if (Array.isArray(saved) && saved.length) setQuickIds(saved.filter((id: string) => QUICK_BY_ID[id]))
    } catch {
      // ignore
    }
  }, [])

  const toggleQuick = (id: string) => {
    setQuickIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_QUICK
          ? prev
          : [...prev, id]
      try { localStorage.setItem('dash_quick_actions', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const markFollowupDone = async (jobId: string) => {
    const prev = followups
    setFollowups((p) => p.filter((j) => j.id !== jobId))
    try {
      await updateJob(jobId, { followup_done: true })
    } catch {
      // si falla, restauramos el item para no perder el seguimiento
      setFollowups(prev)
      toast.error('No se pudo marcar el seguimiento')
    }
  }

  useEffect(() => {
    getClients()
      .then((clients) => {
        const due = clients
          .filter(
            (c) =>
              hasMaintenance(c) &&
              maintenanceStatus(c.last_service_date as string, c.maintenance_months as number) !== 'ok'
          )
          .sort(
            (a, b) =>
              nextDueDate(a.last_service_date as string, a.maintenance_months as number).getTime() -
              nextDueDate(b.last_service_date as string, b.maintenance_months as number).getTime()
          )
        setDueMaintenance(due)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    getSettings()
      .then((s) => setIncomeGoal(s.income_goal))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date()
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const [jobStats, financeStats, pendingBalance, today, tomorrow, prevFinance] = await Promise.all([
          getDashboardStats(),
          getFinanceSummary(now.getFullYear(), now.getMonth() + 1),
          getPendingBalance(),
          getTodayJobs(),
          getTomorrowJobs(),
          getFinanceSummary(prev.getFullYear(), prev.getMonth() + 1),
        ])
        setPrevRevenue(prevFinance.totalIncome)

        setStats({
          completedThisMonth: jobStats.completedThisMonth,
          pendingJobs: jobStats.pendingJobs,
          revenueThisMonth: jobStats.revenueThisMonth,
          expensesThisMonth: financeStats.totalExpenses,
          netProfitThisMonth: financeStats.netProfit,
          upcomingJobs: jobStats.upcomingJobs,
          pendingBalance,
          completedUnpaid: jobStats.completedUnpaid,
        })
        setTodayJobs(today)
        setTomorrowJobs(tomorrow)
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) return <DashboardSkeleton />

  const now = new Date()
  const monthName = now.toLocaleString('es-ES', { month: 'long' })

  const rev = stats?.revenueThisMonth || 0
  const revComparison =
    prevRevenue !== null && prevRevenue > 0
      ? `${rev >= prevRevenue ? '↑' : '↓'} ${Math.abs(Math.round(((rev - prevRevenue) / prevRevenue) * 100))}% vs mes pasado`
      : prevRevenue === 0 && rev > 0
        ? 'primer ingreso del periodo'
        : undefined

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{getGreeting(user)}</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthName} {now.getFullYear()}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {(quickIds.length ? quickIds : DEFAULT_QUICK).map((id, i) => {
            const a = QUICK_BY_ID[id]
            if (!a) return null
            const Icon = a.icon
            return (
              <Button
                key={id}
                asChild
                variant={i === 0 ? 'default' : 'outline'}
                className="h-11"
              >
                <Link href={a.href}>
                  <Icon className="h-4 w-4 mr-1.5" />
                  {a.label}
                </Link>
              </Button>
            )
          })}
        </div>
        <button
          onClick={() => setEditQuick(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mx-auto"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Personalizar accesos
        </button>
      </div>

      <Dialog open={editQuick} onOpenChange={setEditQuick}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Accesos rápidos</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Elige hasta {MAX_QUICK} accesos para el inicio.</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => {
              const on = quickIds.includes(a.id)
              const Icon = a.icon
              const full = !on && quickIds.length >= MAX_QUICK
              return (
                <button
                  key={a.id}
                  onClick={() => toggleQuick(a.id)}
                  disabled={full}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                    on
                      ? 'bg-primary text-primary-foreground'
                      : full
                        ? 'bg-muted text-muted-foreground/40'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Today's agenda — lo más relevante del día, arriba del todo */}
      {todayJobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Hoy ({todayJobs.length})
            </h2>
            {todayJobs.some((j) => j.address) && (
              <Button variant="ghost" size="sm" className="h-8" onClick={openTodayRoute}>
                <Navigation className="h-3.5 w-3.5 mr-1" />
                Ruta
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {todayJobs.map((job) => (
              <Link key={job.id} href={`/trabajos/${job.id}`} className="block">
                <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium truncate">{job.title}</h3>
                        <JobStatusBadge status={job.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.scheduled_at &&
                          new Date(job.scheduled_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        {job.client ? ` · ${job.client.name}` : ''}
                      </p>
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
      )}

      {/* Tomorrow reminder */}
      {tomorrowJobs.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold flex items-center gap-2 mb-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            Mañana tienes {tomorrowJobs.length} trabajo{tomorrowJobs.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {tomorrowJobs.map((job) => (
              <Link
                key={job.id}
                href={`/trabajos/${job.id}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">
                  {job.scheduled_at &&
                    new Date(job.scheduled_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  {' · '}
                  {job.title}
                </span>
                {job.client && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 truncate max-w-[35%]">
                    {job.client.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* This week summary */}
      {weekStats && (weekStats.count > 0 || weekStats.income > 0) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Esta semana</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-lg font-bold text-money">{formatCurrency(weekStats.income)}</p>
              <p className="text-xs text-muted-foreground">ingresos</p>
            </div>
            <div>
              <p className="text-lg font-bold">{weekStats.count}</p>
              <p className="text-xs text-muted-foreground">trabajos completados</p>
            </div>
          </div>
          {incomeGoal > 0 && (() => {
            const weeklyGoal = Math.round(incomeGoal / 4.33)
            const pct = Math.min(100, (weekStats.income / weeklyGoal) * 100)
            return (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Meta semanal</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(weekStats.income)} / {formatCurrency(weeklyGoal)}
                  </p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: weekStats.income >= weeklyGoal ? '#22c55e' : 'hsl(var(--primary))',
                    }}
                  />
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Pending balance alert */}
      {(stats?.pendingBalance || 0) > 0 && (
        <Link href="/cobranza" className="block">
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Por cobrar</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80">En trabajos activos</p>
              </div>
            </div>
            <p className="text-lg font-bold text-pending">
              {formatCurrency(stats?.pendingBalance || 0)}
            </p>
          </div>
        </Link>
      )}

      {/* Completed but not yet collected */}
      {(stats?.completedUnpaid || 0) > 0 && (
        <Link href="/trabajos?cobro=sin-cobrar" className="block">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Completados sin cobrar</p>
                <p className="text-xs text-muted-foreground">Listos para marcar como cobrados</p>
              </div>
            </div>
            <p className="text-lg font-bold text-primary">{stats?.completedUnpaid || 0}</p>
          </div>
        </Link>
      )}

      {/* Maintenance due */}
      {dueMaintenance.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-500" />
            Mantenimientos ({dueMaintenance.length})
          </h2>
          <div className="space-y-4">
            {dueMaintenance.map((c) => {
              const last = c.last_service_date as string
              const months = c.maintenance_months as number
              const overdue = maintenanceStatus(last, months) === 'due'
              return (
                <Card key={c.id} className={overdue ? 'border-destructive/40' : 'border-amber-500/30'}>
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {overdue ? 'Vencido — ' : 'Próximo — '}
                        {formatDate(nextDueDate(last, months).toISOString())}
                      </p>
                    </Link>
                    <Button size="sm" variant="outline" className="flex-shrink-0 h-8" onClick={() => scheduleMaintenance(c)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agendar
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Follow-ups due */}
      {followups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Seguimientos ({followups.length})
          </h2>
          <div className="space-y-4">
            {followups.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <Link href={`/trabajos/${job.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.client ? `${job.client.name} · ` : ''}
                      {job.followup_at && formatDate(job.followup_at)}
                    </p>
                  </Link>
                  <Button size="sm" variant="outline" className="flex-shrink-0 h-8" onClick={() => markFollowupDone(job.id)}>
                    Listo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Ingresos del mes"
          value={formatCurrency(stats?.revenueThisMonth || 0)}
          valueNumber={stats?.revenueThisMonth || 0}
          format={formatCurrency}
          subtitle={revComparison}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <StatCard
          title="Ganancia neta"
          value={formatCurrency(stats?.netProfitThisMonth || 0)}
          valueNumber={stats?.netProfitThisMonth || 0}
          format={formatCurrency}
          icon={TrendingDown}
          iconColor={(stats?.netProfitThisMonth || 0) >= 0 ? 'text-green-500' : 'text-destructive'}
          iconBg={(stats?.netProfitThisMonth || 0) >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}
        />
        <StatCard
          title="Completados (mes)"
          value={String(stats?.completedThisMonth || 0)}
          valueNumber={stats?.completedThisMonth || 0}
          format={(n) => String(Math.round(n))}
          subtitle="trabajos completados"
          icon={Briefcase}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Pendientes"
          value={String(stats?.pendingJobs || 0)}
          valueNumber={stats?.pendingJobs || 0}
          format={(n) => String(Math.round(n))}
          subtitle="trabajos activos"
          icon={Clock}
          iconColor="text-yellow-500"
          iconBg="bg-yellow-500/10"
        />
      </div>

      {/* Proyección del mes: lo cobrado + lo que falta por cobrar */}
      {(stats?.pendingBalance || 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Proyección</p>
              <p className="text-xs text-muted-foreground">Si cobras todo lo pendiente</p>
            </div>
            <p className="text-xl font-bold text-money">
              {formatCurrency((stats?.revenueThisMonth || 0) + (stats?.pendingBalance || 0))}
            </p>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Cobrado: <span className="text-money font-medium">{formatCurrency(stats?.revenueThisMonth || 0)}</span></span>
            <span>Por cobrar: <span className="text-pending font-medium">{formatCurrency(stats?.pendingBalance || 0)}</span></span>
          </div>
        </div>
      )}

      {/* Income goal progress */}
      {incomeGoal > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold">Meta mensual</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(stats?.revenueThisMonth || 0)} / {formatCurrency(incomeGoal)}
            </p>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, ((stats?.revenueThisMonth || 0) / incomeGoal) * 100)}%`,
                backgroundColor: (stats?.revenueThisMonth || 0) >= incomeGoal ? '#22c55e' : 'hsl(var(--primary))',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {Math.round(Math.min(100, ((stats?.revenueThisMonth || 0) / incomeGoal) * 100))}% alcanzado
          </p>
        </div>
      )}

      <UpcomingJobs jobs={stats?.upcomingJobs || []} />
    </div>
  )
}
