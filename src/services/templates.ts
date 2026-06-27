import { createClient } from '@/lib/supabase/client'

export interface JobTemplateData {
  title: string
  description?: string
  address?: string
  category: string
  price: number
  payment_method?: string
  notes?: string
}

export interface JobTemplate {
  id: string
  name: string
  data: JobTemplateData
}

export async function getTemplates(): Promise<JobTemplate[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('job_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map((r) => ({ id: r.id, name: r.name, data: r.data as JobTemplateData }))
}

export async function createTemplate(name: string, data: JobTemplateData): Promise<JobTemplate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: row, error } = await supabase
    .from('job_templates')
    .insert({ user_id: user.id, name, data })
    .select()
    .single()

  if (error) throw error
  return { id: row.id, name: row.name, data: row.data as JobTemplateData }
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_templates').delete().eq('id', id)
  if (error) throw error
}
