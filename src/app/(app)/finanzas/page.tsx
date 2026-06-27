'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { StatCardSkeleton } from '@/components/shared/loading-skeleton'
import { getFinanceSummary, getExpensesByMonth } from '@/services/expenses'
import { getJobsByMonth, getIncomeTrend } from '@/services/jobs'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  materiales: 'Materiales',
  herramientas: 'Herramientas',
  transporte: 'Transporte',
  combustible: 'Combustible',
  comida: 'Comida',
  licencias: 'Licencias',
  marketing: 'Marketing',
  otros: 'Otros',
}

interface FinanceSummary {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  expensesByCategory: Record<string, number>
}

interface MonthlyIncome {
  year: number
  month: number
  income: number
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function IncomeTrendChart({ data }: { data: MonthlyIncome[] }) {
  const max = Math.max(...data.map(d => d.income), 1)
  const now = new Date()

  return (
    <div className="flex items-end gap-1.5 h-28 pt-2">
      {data.map(({ year, month, income }) => {
        const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1
        const pct = (income / max) * 100
        return (
          <div key={`${year}-${month}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {income > 0 && (
              <span className="text-[8px] text-muted-foreground leading-none">
                {income >= 1000 ? `${Math.round(income / 1000)}k` : String(Math.round(income))}
              </span>
            )}
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t-sm transition-all duration-500 ${isCurrent ? 'bg-primary' : 'bg-primary/40'}`}
                style={{ height: pct > 0 ? `${Math.max(pct, 4)}%` : '2px', opacity: pct > 0 ? 1 : 0.2 }}
              />
            </div>
            <span className={`text-[9px] leading-none ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {MONTH_SHORT[month - 1]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function FinanzasPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [incomeTrend, setIncomeTrend] = useState<MonthlyIncome[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIncomeTrend(6).then(setIncomeTrend).catch(() => {})
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [fin, jobs] = await Promise.all([
          getFinanceSummary(year, month),
          getJobsByMonth(year, month),
        ])
        setSummary(fin)
        setRecentJobs(jobs.filter((j: any) => j.status === 'completado'))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const maxExpense = summary
    ? Math.max(...Object.values(summary.expensesByCategory), 1)
    : 1

  return (
    <div className="space-y-6 page-transition">
      <PageHeader title="Finanzas" />

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded-lg p-1.5 bg-green-500/10">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                </div>
                <p className="text-xl font-bold text-green-500">
                  {formatCurrency(summary?.totalIncome || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded-lg p-1.5 bg-destructive/10">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground">Gastos</p>
                </div>
                <p className="text-xl font-bold text-destructive">
                  -{formatCurrency(summary?.totalExpenses || 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg p-1.5 bg-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Ganancia neta</p>
                  </div>
                  <p className={`text-2xl font-bold ${(summary?.netProfit || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {formatCurrency(summary?.netProfit || 0)}
                  </p>
                </div>

                {/* Income vs Expense visual bar */}
                {(summary?.totalIncome || 0) + (summary?.totalExpenses || 0) > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Ingresos vs Gastos</span>
                      <span>
                        {summary && summary.totalIncome > 0
                          ? Math.round(((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100)
                          : 0}% margen
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            summary && summary.totalIncome > 0
                              ? Math.min(100, ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100)
                              : 0
                          }%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {incomeTrend.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Ingresos — últimos 6 meses</p>
                <IncomeTrendChart data={incomeTrend} />
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="ingresos">
            <TabsList className="w-full">
              <TabsTrigger value="ingresos" className="flex-1">Ingresos</TabsTrigger>
              <TabsTrigger value="gastos" className="flex-1">Gastos</TabsTrigger>
            </TabsList>

            <TabsContent value="ingresos" className="space-y-5 mt-4">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sin ingresos este mes
                </p>
              ) : (
                recentJobs.map((job) => (
                  <Link key={job.id} href={`/trabajos/${job.id}`}>
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{job.title}</p>
                          {job.completed_at && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(job.completed_at)}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-green-500 ml-3">
                          +{formatCurrency(job.price)}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>

            <TabsContent value="gastos" className="space-y-3 mt-4">
              {/* Category chart */}
              {summary && Object.keys(summary.expensesByCategory).length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Por categoría</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(summary.expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amount]) => (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {EXPENSE_CATEGORY_LABELS[cat] || cat}
                            </span>
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-destructive/60 rounded-full transition-all duration-500"
                              style={{ width: `${(amount / maxExpense) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sin gastos este mes
                </p>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href="/gastos">Ver todos los gastos</Link>
              </Button>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
