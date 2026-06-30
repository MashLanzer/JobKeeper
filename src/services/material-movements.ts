import { createClient } from '@/lib/supabase/client'

export interface MaterialMovement {
  id: string
  material_id: string
  delta: number
  reason?: string | null
  created_at: string
}

/** Registra un movimiento de stock (+ entrada / − salida). No es crítico. */
export async function addMovement(materialId: string, delta: number, reason: string): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('material_movements').insert({
      user_id: user.id,
      material_id: materialId,
      delta,
      reason,
    })
  } catch {
    // si la tabla no existe aún, lo ignoramos (no rompe el ajuste de stock)
  }
}

export async function getMovements(materialId: string): Promise<MaterialMovement[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_movements')
      .select('*')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data || []) as MaterialMovement[]
  } catch {
    return []
  }
}
