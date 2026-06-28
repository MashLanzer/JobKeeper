import { createClient } from '@/lib/supabase/client'

export interface RecurringExpense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  created_at: string
}

export type RecurringExpenseInput = {
  description: string
  amount: number
  category: string
}

/** Lectura protegida: si la tabla aún no existe, devuelve []. */
export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as RecurringExpense[]
  } catch {
    return []
  }
}

export async function createRecurringExpense(input: RecurringExpenseInput): Promise<RecurringExpense> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as RecurringExpense
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error
}
