'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { StatCardSkeleton } from '@/components/shared/loading-skeleton'
import { getFinanceSummary, getExpensesByMonth } from '@/services/expenses'
import { getPaidJobsByMonth, getIncomeTrend, getJobsByMonth } from '@/services/jobs'
import { getPaymentsTotalForJobs } from '@/services/payments'
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

function IncomeTrendChart({ data, selected, onSelect }: { data: MonthlyIncome[]; selected?: { year: number; month: number }; onSelect?: (year: number, month: number) => void }) {
  const max = Math.max(...data.map(d => d.income), 1)

  return (
    <div className="flex items-end gap-1.5 h-28 pt-2">
      {data.map(({ year, month, income }) => {
        const isCurrent = selected ? year === selected.year && month === selected.month : false
        const pct = (income / max) * 100
        return (
          <button
            key={`${year}-${month}`}
            onClick={() => onSelect?.(year, month)}
            className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
          >
            {income > 0 && (
              <span className="text-[8px] text-muted-foreground leading-none">
                {income >= 1000 ? `${Math.round(income / 1000)}k` : String(Math.round(income))}
              </span>
            )}
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t-sm transition-all duration-500 group-hover:bg-primary/70 ${isCurrent ? 'bg-primary' : 'bg-primary/40'}`}
                style={{ height: pct > 0 ? `${Math.max(pct, 4)}%` : '2px', opacity: pct > 0 ? 1 : 0.2 }}
              />
            </div>
            <span className={`text-[9px] leading-none ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {MONTH_SHORT[month - 1]}
            </span>
          </button>
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
  const [prevSummary, setPrevSummary] = useState<FinanceSummary | null>(null)
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [incomeTrend, setIncomeTrend] = useState<MonthlyIncome[]>([])
  const [cashFlow, setCashFlow] = useState<{ billed: number; collected: number; pending: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIncomeTrend(6).then(setIncomeTrend).catch(() => {})
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const prevDate = new Date(year, month - 2, 1) // mes anterior
        const [fin, jobs, prevFin] = await Promise.all([
          getFinanceSummary(year, month),
          getPaidJobsByMonth(year, month),
          getFinanceSummary(prevDate.getFullYear(), prevDate.getMonth() + 1),
        ])
        setSummary(fin)
        setPrevSummary(prevFin)
        // Lo cobrado del mes: coincide con el total de "Ingresos".
        setRecentJobs(jobs)

        // Flujo de caja del mes: facturado vs cobrado vs por cobrar.
        try {
          const monthJobs = await getJobsByMonth(year, month)
          const active = monthJobs.filter((j) => j.status !== 'cancelado')
          const payMap = await getPaymentsTotalForJobs(active.map((j) => j.id))
          const billed = active.reduce((s, j) => s + Number(j.price), 0)
          const collected = active.reduce(
            (s, j) => s + Number(j.deposit) + (payMap[j.id] || 0),
            0
          )
          setCashFlow({ billed, collected, pending: Math.max(0, billed - collected) })
        } catch {
          setCashFlow(null)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, month])

  // Cambio porcentual vs mes anterior (null si no hay base de comparación).
  const pctChange = (cur: number, prev: number): number | null =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null

  // Ingresos por categoría (sobre lo cobrado del mes).
  const incomeByCategory = recentJobs.reduce((acc: Record<string, number>, j: any) => {
    const cat = j.category || 'General/Varios'
    acc[cat] = (acc[cat] || 0) + Number(j.price)
    return acc
  }, {})
  const incomeCatEntries = Object.entries(incomeByCategory).sort(([, a], [, b]) => (b as number) - (a as number))
  const maxIncomeCat = Math.max(...(incomeCatEntries.map(([, v]) => v as number)), 1)

  const incomeChange = summary && prevSummary ? pctChange(summary.totalIncome, prevSummary.totalIncome) : null
  const expenseChange = summary && prevSummary ? pctChange(summary.totalExpenses, prevSummary.totalExpenses) : null
  const netChange = summary && prevSummary && prevSummary.netProfit > 0 ? pctChange(summary.netProfit, prevSummary.netProfit) : null

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

  // No hay cobros en meses futuros: no dejamos avanzar más allá del mes actual.
  const atCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="space-y-6 page-transition">
      <PageHeader title="Finanzas" />

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3">
        <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={nextMonth} disabled={atCurrentMonth}>
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
                  <p className="text-xs text-muted-foreground">Ingresos (cobrado)</p>
                </div>
                <p className="text-xl font-bold text-money">
                  {formatCurrency(summary?.totalIncome || 0)}
                </p>
                {incomeChange !== null && (
                  <p className={`text-[11px] mt-0.5 ${incomeChange >= 0 ? 'text-money' : 'text-pending'}`}>
                    {incomeChange >= 0 ? '↑' : '↓'} {Math.abs(incomeChange)}% vs mes pasado
                  </p>
                )}
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
                {expenseChange !== null && (
                  <p className={`text-[11px] mt-0.5 ${expenseChange <= 0 ? 'text-money' : 'text-pending'}`}>
                    {expenseChange >= 0 ? '↑' : '↓'} {Math.abs(expenseChange)}% vs mes pasado
                  </p>
                )}
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
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${(summary?.netProfit || 0) >= 0 ? 'text-money' : 'text-destructive'}`}>
                      {formatCurrency(summary?.netProfit || 0)}
                    </p>
                    {netChange !== null && (
                      <p className={`text-[11px] ${netChange >= 0 ? 'text-money' : 'text-pending'}`}>
                        {netChange >= 0 ? '↑' : '↓'} {Math.abs(netChange)}% vs mes pasado
                      </p>
                    )}
                  </div>
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
                <p className="text-xs font-semibold text-muted-foreground mb-3">Ingresos — últimos 6 meses (toca para ver)</p>
                <IncomeTrendChart
                  data={incomeTrend}
                  selected={{ year, month }}
                  onSelect={(y, m) => { setYear(y); setMonth(m) }}
                />
              </CardContent>
            </Card>
          )}

          {cashFlow && cashFlow.billed > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Flujo de caja del mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(cashFlow.collected / cashFlow.billed) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${(cashFlow.pending / cashFlow.billed) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Facturado</span>
                  <span className="font-semibold">{formatCurrency(cashFlow.billed)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Cobrado
                  </span>
                  <span className="font-medium text-money">{formatCurrency(cashFlow.collected)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Por cobrar
                  </span>
                  <span className="font-medium text-pending">{formatCurrency(cashFlow.pending)}</span>
                </div>
                {cashFlow.pending > 0 && (
                  <Link href="/cobranza" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver cobranza
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="ingresos">
            <TabsList className="w-full">
              <TabsTrigger value="ingresos" className="flex-1">Ingresos</TabsTrigger>
              <TabsTrigger value="gastos" className="flex-1">Gastos</TabsTrigger>
            </TabsList>

            <TabsContent value="ingresos" className="mt-4 space-y-3">
              {incomeCatEntries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Por categoría</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {incomeCatEntries.map(([cat, amount]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className="font-medium text-money">{formatCurrency(amount as number)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500/60 rounded-full transition-all duration-500"
                            style={{ width: `${((amount as number) / maxIncomeCat) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sin cobros este mes
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentJobs.map((job) => (
                    <Link key={job.id} href={`/trabajos/${job.id}`} className="block">
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{job.title}</p>
                            {job.paid_at && (
                              <p className="text-xs text-muted-foreground">
                                Cobrado · {formatDate(job.paid_at)}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-money ml-3">
                            +{formatCurrency(job.price)}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
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
