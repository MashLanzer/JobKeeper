import { createClient } from '@/lib/supabase/client'

const BUCKET = 'job-audio'

export interface JobAudio {
  id: string
  job_id: string
  path: string
  created_at: string
}

/** Notas de voz de un trabajo (más recientes primero). Resiliente si falta la tabla. */
export async function getJobAudio(jobId: string): Promise<JobAudio[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('job_audio')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as JobAudio[]) || []
  } catch {
    return []
  }
}

/** Sube una nota de voz al Storage y registra la fila. Devuelve la fila o null. */
export async function uploadJobAudio(jobId: string, blob: Blob, ext = 'webm'): Promise<JobAudio | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const path = `${user.id}/${jobId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'audio/webm',
    })
    if (upErr) throw upErr
    const { data, error } = await supabase
      .from('job_audio')
      .insert({ job_id: jobId, path, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data as JobAudio
  } catch {
    return null
  }
}

/** URL firmada temporal para reproducir la nota. */
export async function getAudioUrl(path: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    return data?.signedUrl || null
  } catch {
    return null
  }
}

export async function deleteJobAudio(id: string, path: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.storage.from(BUCKET).remove([path])
    await supabase.from('job_audio').delete().eq('id', id)
  } catch {
    // ignore
  }
}
