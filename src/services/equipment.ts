import { createClient } from '@/lib/supabase/client'
import type { Equipment } from '@/types'

export type EquipmentInput = Omit<Equipment, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** Lectura protegida: si la tabla aún no existe, devuelve []. */
export async function getEquipmentForClient(clientId: string): Promise<Equipment[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as Equipment[]
  } catch {
    return []
  }
}

export async function createEquipment(input: EquipmentInput): Promise<Equipment> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('equipment')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Equipment
}

export async function updateEquipment(id: string, input: Partial<EquipmentInput>): Promise<Equipment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('equipment')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Equipment
}

export async function deleteEquipment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) throw error
}
