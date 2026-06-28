import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types'

export async function getClients(search?: string): Promise<Client[]> {
  const supabase = createClient()

  let query = supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Client[]
}

export async function getClient(id: string): Promise<Client> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Client
}

// Quita la columna `type` del payload (respaldo si el SQL aún no se corrió).
function withoutType<T extends Record<string, unknown>>(obj: T): Omit<T, 'type'> {
  const { type: _omit, ...rest } = obj
  return rest
}

function isMissingTypeColumn(error: { message?: string } | null): boolean {
  return !!error?.message && /\btype\b/.test(error.message) && /column/i.test(error.message)
}

export async function createClientRecord(client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Client> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const payload = { ...client, user_id: user.id }
  let { data, error } = await supabase.from('clients').insert(payload).select().single()

  if (error && isMissingTypeColumn(error)) {
    ;({ data, error } = await supabase.from('clients').insert(withoutType(payload)).select().single())
  }

  if (error) throw error
  return data as Client
}

export async function updateClient(id: string, client: Partial<Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Client> {
  const supabase = createClient()

  let { data, error } = await supabase.from('clients').update(client).eq('id', id).select().single()

  if (error && isMissingTypeColumn(error)) {
    ;({ data, error } = await supabase.from('clients').update(withoutType(client)).eq('id', id).select().single())
  }

  if (error) throw error
  return data as Client
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getClientWithJobs(id: string) {
  const supabase = createClient()

  const [clientRes, jobsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('jobs')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (clientRes.error) throw clientRes.error

  return {
    client: clientRes.data as Client,
    jobs: jobsRes.data || [],
  }
}
