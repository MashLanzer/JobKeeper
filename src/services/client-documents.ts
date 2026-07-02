import { createClient } from '@/lib/supabase/client'

const BUCKET = 'client-docs'

export interface ClientDocument {
  id: string
  client_id: string
  name: string | null
  path: string
  created_at: string
}

/** Documentos de un cliente (más recientes primero). Resiliente si falta la tabla. */
export async function getClientDocuments(clientId: string): Promise<ClientDocument[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as ClientDocument[]) || []
  } catch {
    return []
  }
}

/** Sube un documento al Storage y registra la fila. Devuelve la fila o null. */
export async function uploadClientDocument(clientId: string, file: File): Promise<ClientDocument | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const path = `${user.id}/${clientId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
    if (upErr) throw upErr
    const { data, error } = await supabase
      .from('client_documents')
      .insert({ client_id: clientId, path, name: file.name, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data as ClientDocument
  } catch {
    return null
  }
}

/** URL firmada temporal para abrir/descargar el documento. */
export async function getDocumentUrl(path: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    return data?.signedUrl || null
  } catch {
    return null
  }
}

export async function deleteClientDocument(id: string, path: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.storage.from(BUCKET).remove([path])
    await supabase.from('client_documents').delete().eq('id', id)
  } catch {
    // ignore
  }
}
