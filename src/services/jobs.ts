import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/types'

export interface JobFilters {
  status?: JobStatus
  category?: string
  search?: string
  from?: string
  to?: string
  paid?: boolean
}

export async function getJobs(filters?: JobFilters): Promise<Job[]> {
  const supabase = createClient()

  let query = supabase
    .from('jobs')
    .select('*, client:clients(id, name, phone, email)')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  if (filters?.from) {
    query = query.gte('scheduled_at', filters.from)
  }

  if (filters?.to) {
    query = query.lte('scheduled_at', filters.to)
  }

  if (filters?.paid === true) {
    query = query.not('paid_at', 'is', null)
  } else if (filters?.paid === false) {
    query = query.is('paid_at', null)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Job[]
}

export async function getJob(id: string): Promise<Job> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name, phone, email, address)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Job
}

export async function createJob(job: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Job> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...job, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Job
}

export async function updateJob(id: string, job: Partial<Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Job> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('jobs')
    .update(job)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Job
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getJobsByMonth(year: number, month: number): Promise<Job[]> {
  const supabase = createClient()

  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  // Incluye trabajos con fecha programada en el mes, y también los que no
  // tienen fecha programada pero fueron creados dentro del mes (para que
  // todo trabajo aparezca en el calendario en algún día).
  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .or(
      `and(scheduled_at.gte.${startDate},scheduled_at.lte.${endDate}),` +
      `and(scheduled_at.is.null,created_at.gte.${startDate},created_at.lte.${endDate})`
    )
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return data as Job[]
}

/** Trabajos cobrados en un mes (por paid_at). Coincide con el ingreso del mes. */
export async function getPaidJobsByMonth(year: number, month: number): Promise<Job[]> {
  const supabase = createClient()
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .not('paid_at', 'is', null)
    .gte('paid_at', start)
    .lte('paid_at', end)
    .order('paid_at', { ascending: false })

  if (error) throw error
  return data as Job[]
}

export async function getTodayJobs(): Promise<Job[]> {
  const supabase = createClient()
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return data as Job[]
}

export async function getWeekStats(): Promise<{ income: number; count: number }> {
  const supabase = createClient()
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay()) // domingo de esta semana
  start.setHours(0, 0, 0, 0)
  const startISO = start.toISOString()

  // Ingresos = cobrado esta semana (paid_at); count = trabajos completados.
  const [paidRes, completedRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('price, paid_at')
      .not('paid_at', 'is', null)
      .gte('paid_at', startISO),
    supabase
      .from('jobs')
      .select('id')
      .eq('status', 'completado')
      .gte('completed_at', startISO),
  ])

  if (paidRes.error) throw paidRes.error
  return {
    income: (paidRes.data || []).reduce((s, j) => s + Number(j.price), 0),
    count: completedRes.data?.length || 0,
  }
}

export async function getTomorrowJobs(): Promise<Job[]> {
  const supabase = createClient()
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)
    .in('status', ['pendiente', 'en_progreso'])
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return data as Job[]
}

export async function getFollowupsDue(): Promise<Job[]> {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .not('followup_at', 'is', null)
    .lte('followup_at', today)
    .or('followup_done.is.null,followup_done.eq.false')
    .order('followup_at', { ascending: true })

  if (error) throw error
  return data as Job[]
}

/** Cotizaciones enviadas que aún no tienen respuesta (ni aceptada ni rechazada). */
export async function getPendingQuotes(): Promise<Job[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .eq('quote_status', 'enviada')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Job[]
}

export async function getPendingBalance() {
  const supabase = createClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, price, deposit')
    .neq('status', 'cancelado')
  if (error) throw error

  const ids = (jobs || []).map((j) => j.id)
  const paymentsByJob: Record<string, number> = {}
  if (ids.length) {
    const { data: pays } = await supabase.from('payments').select('job_id, amount').in('job_id', ids)
    for (const p of pays || []) {
      paymentsByJob[p.job_id] = (paymentsByJob[p.job_id] || 0) + Number(p.amount)
    }
  }

  return (jobs || []).reduce((sum, job) => {
    const pending = Number(job.price) - Number(job.deposit) - (paymentsByJob[job.id] || 0)
    return sum + (pending > 0 ? pending : 0)
  }, 0)
}

export async function getIncomeTrend(months = 6) {
  const supabase = createClient()
  const now = new Date()

  const periods = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      startDate: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    }
  })

  const responses = await Promise.all(
    periods.map(({ startDate, endDate }) =>
      // Ingreso del mes = lo cobrado (paid_at), no lo completado.
      supabase
        .from('jobs')
        .select('price')
        .not('paid_at', 'is', null)
        .gte('paid_at', startDate)
        .lte('paid_at', endDate)
    )
  )

  return periods.map(({ year, month }, i) => ({
    year,
    month,
    income: (responses[i].data || []).reduce((sum, job) => sum + Number(job.price), 0),
  }))
}

export async function getDashboardStats() {
  const supabase = createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const [completedRes, paidRes, pendingRes, upcomingRes, unpaidRes] = await Promise.all([
    // Conteo de trabajos completados este mes (por completed_at)
    supabase
      .from('jobs')
      .select('id')
      .eq('status', 'completado')
      .gte('completed_at', startOfMonth)
      .lte('completed_at', endOfMonth),
    // Ingresos = lo cobrado este mes (por paid_at), no lo completado
    supabase
      .from('jobs')
      .select('price')
      .not('paid_at', 'is', null)
      .gte('paid_at', startOfMonth)
      .lte('paid_at', endOfMonth),
    supabase
      .from('jobs')
      .select('id')
      .in('status', ['pendiente', 'en_progreso']),
    supabase
      .from('jobs')
      .select('*, client:clients(id, name)')
      .in('status', ['pendiente', 'en_progreso'])
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5),
    // Trabajos completados pero aún sin cobrar (paid_at nulo)
    supabase
      .from('jobs')
      .select('id')
      .eq('status', 'completado')
      .is('paid_at', null),
  ])

  const revenueThisMonth = (paidRes.data || []).reduce(
    (sum, job) => sum + (Number(job.price) || 0),
    0
  )

  return {
    completedUnpaid: unpaidRes.data?.length || 0,
    completedThisMonth: completedRes.data?.length || 0,
    pendingJobs: pendingRes.data?.length || 0,
    revenueThisMonth,
    upcomingJobs: upcomingRes.data || [],
  }
}
