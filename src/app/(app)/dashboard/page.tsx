'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Briefcase, Clock, TrendingDown } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { DashboardSkeleton } from '@/components/shared/loading-skeleton'
import { getDashboardStats } from '@/services/jobs'
import { getFinanceSummary } from '@/services/expenses'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  completedThisMonth: number
  pendingJobs: number
  revenueThisMonth: number
  expensesThisMonth: number
  netProfitThisMonth: number
  upcomingJobs: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date()
        const [jobStats, financeStats] = await Promise.all([
          getDashboardStats(),
          getFinanceSummary(now.getFullYear(), now.getMonth() + 1),
        ])

        setStats({
          completedThisMonth: jobStats.completedThisMonth,
          pendingJobs: jobStats.pendingJobs,
          revenueThisMonth: jobStats.revenueThisMonth,
          expensesThisMonth: financeStats.totalExpenses,
          netProfitThisMonth: financeStats.netProfit,
          upcomingJobs: jobStats.upcomingJobs,
        })
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de control</h1>
        <p className="text-sm text-muted-foreground capitalize">{monthName} {now.getFullYear()}</p>
      </div>

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

      <UpcomingJobs jobs={stats?.upcomingJobs || []} />
    </div>
  )
}
