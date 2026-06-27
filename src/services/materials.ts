import { createClient } from '@/lib/supabase/client'
import type { Material } from '@/types'

export type MaterialInput = Omit<Material, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export async function getMaterials(): Promise<Material[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as Material[]
}

export async function createMaterial(input: MaterialInput): Promise<Material> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('materials')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Material
}

export async function updateMaterial(id: string, input: Partial<MaterialInput>): Promise<Material> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materials')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Material
}

export async function deleteMaterial(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('materials').delete().eq('id', id)
  if (error) throw error
}
