import { createClient } from '@/lib/supabase/client'

export interface MonthBreakdown {
  month: number
  income: number
  expenses: number
  net: number
}

export interface YearReport {
  year: number
  months: MonthBreakdown[]
  totalIncome: number
  totalExpenses: number
  netProfit: number
  incomeByCategory: Record<string, number>
  jobsCompleted: number
}

/**
 * Reporte anual: ingresos (trabajos completados) y gastos por mes, totales,
 * y desglose de ingresos por categoría. Hace solo 2 consultas y agrega en
 * memoria para ser eficiente.
 */
export interface BusinessStats {
  avgTicket: number
  topCategory: string | null
  topClient: { name: string; total: number } | null
  avgDaysToCollect: number | null
  completedCount: number
}

export async function getBusinessStats(): Promise<BusinessStats> {
  const supabase = createClient()
  const { data } = await supabase
    .from('jobs')
    .select('price, category, status, completed_at, paid_at, client:clients(name)')

  const jobs = (data || []) as Array<{
    price: number
    category: string
    status: string
    completed_at: string | null
    paid_at: string | null
    client: { name: string } | { name: string }[] | null
  }>

  const completed = jobs.filter((j) => j.status === 'completado')
  const avgTicket = completed.length
    ? completed.reduce((s, j) => s + Number(j.price), 0) / completed.length
    : 0

  const catCount: Record<string, number> = {}
  for (const j of jobs) catCount[j.category] = (catCount[j.category] || 0) + 1
  const topCategory = Object.entries(catCount).sort(([, a], [, b]) => b - a)[0]?.[0] || null

  const clientTotals: Record<string, number> = {}
  for (const j of completed) {
    const c = Array.isArray(j.client) ? j.client[0] : j.client
    const name = c?.name
    if (name) clientTotals[name] = (clientTotals[name] || 0) + Number(j.price)
  }
  const topEntry = Object.entries(clientTotals).sort(([, a], [, b]) => b - a)[0]
  const topClient = topEntry ? { name: topEntry[0], total: topEntry[1] } : null

  const withBoth = completed.filter((j) => j.completed_at && j.paid_at)
  const avgDaysToCollect = withBoth.length
    ? withBoth.reduce(
        (s, j) => s + (new Date(j.paid_at as string).getTime() - new Date(j.completed_at as string).getTime()) / 86400000,
        0
      ) / withBoth.length
    : null

  return { avgTicket, topCategory, topClient, avgDaysToCollect, completedCount: completed.length }
}

export async function getYearReport(year: number): Promise<YearReport> {
  const supabase = createClient()

  const startISO = new Date(year, 0, 1).toISOString()
  const endISO = new Date(year, 11, 31, 23, 59, 59).toISOString()
  const startStr = `${year}-01-01`
  const endStr = `${year}-12-31`

  const [jobsRes, expRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('price, category, completed_at')
      .eq('status', 'completado')
      .gte('completed_at', startISO)
      .lte('completed_at', endISO),
    supabase
      .from('expenses')
      .select('amount, date')
      .gte('date', startStr)
      .lte('date', endStr),
  ])

  const months: MonthBreakdown[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expenses: 0,
    net: 0,
  }))

  const incomeByCategory: Record<string, number> = {}
  let totalIncome = 0
  let jobsCompleted = 0

  for (const job of jobsRes.data || []) {
    if (!job.completed_at) continue
    const m = new Date(job.completed_at).getMonth()
    const price = Number(job.price) || 0
    months[m].income += price
    totalIncome += price
    jobsCompleted += 1
    const cat = job.category || 'General/Varios'
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + price
  }

  let totalExpenses = 0
  for (const exp of expRes.data || []) {
    const m = new Date(exp.date).getMonth()
    const amount = Number(exp.amount) || 0
    months[m].expenses += amount
    totalExpenses += amount
  }

  for (const mb of months) mb.net = mb.income - mb.expenses

  return {
    year,
    months,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeByCategory,
    jobsCompleted,
  }
}
