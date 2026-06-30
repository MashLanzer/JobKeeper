import { createClient } from '@/lib/supabase/client'

const BUCKET = 'expense-receipts'

/** Sube la foto del recibo. Devuelve la ruta guardada (o null si falla). */
export async function uploadReceipt(expenseId: string, file: File): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${expenseId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (error) throw error
    return path
  } catch {
    return null
  }
}

/** URL firmada temporal para mostrar/abrir el recibo. */
export async function getReceiptUrl(path: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    return data?.signedUrl || null
  } catch {
    return null
  }
}

export async function deleteReceipt(path: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // ignore
  }
}
