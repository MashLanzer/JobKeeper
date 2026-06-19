import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/types'

export interface JobFilters {
  status?: JobStatus
  category?: string
  search?: string
  from?: string
  to?: string
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

  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate)
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return data as Job[]
}

export async function getDashboardStats() {
  const supabase = createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const [completedRes, pendingRes, upcomingRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('price, deposit')
      .eq('status', 'completado')
      .gte('completed_at', startOfMonth)
      .lte('completed_at', endOfMonth),
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
  ])

  const revenueThisMonth = (completedRes.data || []).reduce(
    (sum, job) => sum + (Number(job.price) || 0),
    0
  )

  return {
    completedThisMonth: completedRes.data?.length || 0,
    pendingJobs: pendingRes.data?.length || 0,
    revenueThisMonth,
    upcomingJobs: upcomingRes.data || [],
  }
}
