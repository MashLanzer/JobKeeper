import { createClient } from '@/lib/supabase/client'

export interface ClientContact {
  id: string
  client_id: string
  kind: string // 'llamada' | 'whatsapp' | 'email' | 'nota'
  note?: string | null
  created_at: string
}

export async function getContacts(clientId: string): Promise<ClientContact[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data || []) as ClientContact[]
  } catch {
    return []
  }
}

export async function addContact(clientId: string, kind: string, note?: string): Promise<ClientContact | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('client_contacts')
      .insert({ user_id: user.id, client_id: clientId, kind, note: note || null })
      .select()
      .single()
    if (error) throw error
    return data as ClientContact
  } catch {
    return null
  }
}

export async function deleteContact(id: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from('client_contacts').delete().eq('id', id)
  } catch {
    // ignore
  }
}
