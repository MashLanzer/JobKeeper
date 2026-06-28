'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DollarSign, Briefcase, Clock, TrendingDown, Plus, ListTodo, AlertCircle, CalendarDays, Wrench, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { DashboardSkeleton } from '@/components/shared/loading-skeleton'
import { getDashboardStats, getPendingBalance, getTodayJobs, getTomorrowJobs, getFollowupsDue } from '@/services/jobs'
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
}

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
  const [dueMaintenance, setDueMaintenance] = useState<Client[]>([])
  const [followups, setFollowups] = useState<Job[]>([])

  useEffect(() => {
    getFollowupsDue().then(setFollowups).catch(() => {})
  }, [])

  const markFollowupDone = async (jobId: string) => {
    setFollowups((prev) => prev.filter((j) => j.id !== jobId))
    try {
      await updateJob(jobId, { followup_done: true })
    } catch {
      // si falla, no es crítico
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

      <div className="flex gap-2">
        <Button asChild className="flex-1 h-11">
          <Link href="/trabajos/nuevo">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo trabajo
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 h-11">
          <Link href="/trabajos?status=pendiente">
            <ListTodo className="h-4 w-4 mr-1.5" />
            Pendientes
          </Link>
        </Button>
      </div>

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
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(stats?.pendingBalance || 0)}
            </p>
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

      {/* Today's agenda */}
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
          <div className="flex flex-col gap-3">
            {todayJobs.map((job) => (
              <Link key={job.id} href={`/trabajos/${job.id}`} className="block">
                <Card className="hover:border-primary/50 transition-colors">
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
                    <span className="text-sm font-semibold text-green-500 flex-shrink-0">
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
