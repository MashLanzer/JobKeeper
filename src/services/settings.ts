import { createClient } from '@/lib/supabase/client'

export interface BusinessSettings {
  name: string
  phone: string
  email: string
  logo: string
  income_goal: number
}

export const EMPTY_SETTINGS: BusinessSettings = {
  name: '',
  phone: '',
  email: '',
  logo: '',
  income_goal: 0,
}

export async function getSettings(): Promise<BusinessSettings> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...EMPTY_SETTINGS }

  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return { ...EMPTY_SETTINGS }

  return {
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    logo: data.logo || '',
    income_goal: Number(data.income_goal) || 0,
  }
}

export async function upsertSettings(patch: Partial<BusinessSettings>): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('business_settings')
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })

  if (error) throw error
}

/** Nombre para los PDFs (cae a "WorkLedger" si no se configuró). */
export function businessNameOf(s: BusinessSettings): string {
  return s.name.trim() || 'WorkLedger'
}
