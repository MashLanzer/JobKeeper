import { createClient } from '@/lib/supabase/client'

export interface Payment {
  id: string
  job_id: string
  amount: number
  method?: string | null
  paid_at: string
  notes?: string | null
  created_at: string
}

export interface NewPayment {
  job_id: string
  amount: number
  method?: string
  paid_at?: string
  notes?: string
}

export async function getPayments(jobId: string): Promise<Payment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('job_id', jobId)
    .order('paid_at', { ascending: false })

  if (error) throw error
  return (data || []) as Payment[]
}

export async function addPayment(input: NewPayment): Promise<Payment> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('payments')
    .insert({ user_id: user.id, ...input })
    .select()
    .single()

  if (error) throw error
  return data as Payment
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

/** Suma de pagos por trabajo, para un conjunto de IDs. */
export async function getPaymentsTotalForJobs(jobIds: string[]): Promise<Record<string, number>> {
  if (jobIds.length === 0) return {}
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('job_id, amount')
    .in('job_id', jobIds)

  if (error) throw error
  const map: Record<string, number> = {}
  for (const row of data || []) {
    map[row.job_id] = (map[row.job_id] || 0) + Number(row.amount)
  }
  return map
}
