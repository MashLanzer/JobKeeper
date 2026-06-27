'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, Briefcase, Clock, TrendingDown, Plus, ListTodo, AlertCircle, CalendarDays, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { DashboardSkeleton } from '@/components/shared/loading-skeleton'
import { getDashboardStats, getPendingBalance, getTodayJobs } from '@/services/jobs'
import { getFinanceSummary } from '@/services/expenses'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  getAllMaintenance,
  nextDueDate,
  maintenanceStatus,
  type MaintenanceRecord,
} from '@/lib/maintenance'
import { useAuth } from '@/hooks/use-auth'
import type { Job } from '@/types'

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
  const [stats, setStats] = useState<Stats | null>(null)
  const [todayJobs, setTodayJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [incomeGoal, setIncomeGoal] = useState(0)
  const [dueMaintenance, setDueMaintenance] = useState<MaintenanceRecord[]>([])

  useEffect(() => {
    const all = getAllMaintenance()
      .filter((r) => maintenanceStatus(r) !== 'ok')
      .sort((a, b) => nextDueDate(a).getTime() - nextDueDate(b).getTime())
    setDueMaintenance(all)
  }, [])

  useEffect(() => {
    const goalKey = `income_goal_${user?.id || 'default'}`
    const saved = localStorage.getItem(goalKey)
    if (saved) setIncomeGoal(Number(saved))
  }, [user?.id])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date()
        const [jobStats, financeStats, pendingBalance, today] = await Promise.all([
          getDashboardStats(),
          getFinanceSummary(now.getFullYear(), now.getMonth() + 1),
          getPendingBalance(),
          getTodayJobs(),
        ])

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
        <Link href="/trabajos">
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
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-500" />
            Mantenimientos ({dueMaintenance.length})
          </h2>
          <div className="space-y-3">
            {dueMaintenance.map((rec) => {
              const overdue = maintenanceStatus(rec) === 'due'
              return (
                <Link key={rec.clientId} href={`/clientes/${rec.clientId}`}>
                  <Card className={overdue ? 'border-destructive/40' : 'border-amber-500/30'}>
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{rec.clientName || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          {overdue ? 'Vencido — ' : 'Próximo — '}
                          {formatDate(nextDueDate(rec).toISOString())}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          overdue
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {overdue ? 'Vencido' : 'Próximo'}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's agenda */}
      {todayJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Hoy ({todayJobs.length})
          </h2>
          <div className="space-y-3">
            {todayJobs.map((job) => (
              <Link key={job.id} href={`/trabajos/${job.id}`}>
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

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Ingresos del mes"
          value={formatCurrency(stats?.revenueThisMonth || 0)}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <StatCard
          title="Ganancia neta"
          value={formatCurrency(stats?.netProfitThisMonth || 0)}
          icon={TrendingDown}
          iconColor={(stats?.netProfitThisMonth || 0) >= 0 ? 'text-green-500' : 'text-destructive'}
          iconBg={(stats?.netProfitThisMonth || 0) >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}
        />
        <StatCard
          title="Completados (mes)"
          value={String(stats?.completedThisMonth || 0)}
          subtitle="trabajos completados"
          icon={Briefcase}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Pendientes"
          value={String(stats?.pendingJobs || 0)}
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
