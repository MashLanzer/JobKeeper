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
