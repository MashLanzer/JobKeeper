import { createClient } from '@/lib/supabase/client'
import type { Expense } from '@/types'

export interface ExpenseFilters {
  category?: string
  from?: string
  to?: string
  job_id?: string
}

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const supabase = createClient()

  let query = supabase
    .from('expenses')
    .select('*, job:jobs(id, title)')
    .order('date', { ascending: false })

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.from) {
    query = query.gte('date', filters.from)
  }

  if (filters?.to) {
    query = query.lte('date', filters.to)
  }

  if (filters?.job_id) {
    query = query.eq('job_id', filters.job_id)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Expense[]
}

export async function getExpense(id: string): Promise<Expense> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('*, job:jobs(id, title)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Expense
}

export async function createExpense(expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Expense> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...expense, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Expense
}

export async function updateExpense(id: string, expense: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Expense> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getExpensesByMonth(year: number, month: number): Promise<Expense[]> {
  const supabase = createClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data as Expense[]
}

export async function getFinanceSummary(year: number, month: number) {
  const supabase = createClient()

  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
  const endDateStr = new Date(year, month, 0).toISOString().split('T')[0]

  const [incomeRes, expensesRes] = await Promise.all([
    // Ingreso = dinero efectivamente cobrado (paid_at), no trabajos completados.
    supabase
      .from('jobs')
      .select('price, paid_at')
      .not('paid_at', 'is', null)
      .gte('paid_at', startDate)
      .lte('paid_at', endDate),
    supabase
      .from('expenses')
      .select('amount, category')
      .gte('date', startDateStr)
      .lte('date', endDateStr),
  ])

  const totalIncome = (incomeRes.data || []).reduce(
    (sum, job) => sum + (Number(job.price) || 0),
    0
  )

  const totalExpenses = (expensesRes.data || []).reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  )

  const expensesByCategory = (expensesRes.data || []).reduce(
    (acc, exp) => {
      const cat = exp.category || 'otros'
      acc[cat] = (acc[cat] || 0) + Number(exp.amount)
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    expensesByCategory,
  }
}
