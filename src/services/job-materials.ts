import { createClient } from '@/lib/supabase/client'

export interface JobMaterial {
  id: string
  job_id: string
  material_id?: string | null
  name: string
  quantity: number
  unit_price: number
  created_at: string
}

export interface NewJobMaterial {
  job_id: string
  material_id?: string | null
  name: string
  quantity: number
  unit_price: number
}

/** Lectura protegida: si la tabla aún no existe, devuelve []. */
export async function getJobMaterials(jobId: string): Promise<JobMaterial[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('job_materials')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as JobMaterial[]
  } catch {
    return []
  }
}

export async function addJobMaterial(input: NewJobMaterial): Promise<JobMaterial> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('job_materials')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error

  // Descuenta del inventario si el material está vinculado (best-effort).
  if (input.material_id) {
    try {
      const { data: mat } = await supabase
        .from('materials')
        .select('stock')
        .eq('id', input.material_id)
        .single()
      if (mat) {
        await supabase
          .from('materials')
          .update({ stock: Number(mat.stock) - Number(input.quantity) })
          .eq('id', input.material_id)
      }
    } catch {
      // no es crítico si falla el descuento de stock
    }
  }

  return data as JobMaterial
}

export async function deleteJobMaterial(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_materials').delete().eq('id', id)
  if (error) throw error
}
