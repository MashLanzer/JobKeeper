'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, Briefcase, Clock, TrendingDown, Plus, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { DashboardSkeleton } from '@/components/shared/loading-skeleton'
import { getDashboardStats } from '@/services/jobs'
import { getFinanceSummary } from '@/services/expenses'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

interface Stats {
  completedThisMonth: number
  pendingJobs: number
  revenueThisMonth: number
  expensesThisMonth: number
  netProfitThisMonth: number
  upcomingJobs: any[]
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
