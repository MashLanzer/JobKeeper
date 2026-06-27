import { createClient } from '@/lib/supabase/client'

export interface JobPhoto {
  id: string
  job_id: string
  path: string
  caption?: string | null
  created_at: string
  url?: string
}

const BUCKET = 'job-photos'

export async function getPhotos(jobId: string): Promise<JobPhoto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = (data || []) as JobPhoto[]

  // El bucket es privado: generamos URLs firmadas temporales para mostrar.
  return Promise.all(
    rows.map(async (r) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(r.path, 3600)
      return { ...r, url: signed?.signedUrl }
    })
  )
}

export async function uploadPhoto(jobId: string, file: File): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}/${jobId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (upErr) throw upErr

  const { error } = await supabase.from('job_photos').insert({ user_id: user.id, job_id: jobId, path })
  if (error) throw error
}

export async function deletePhoto(photo: JobPhoto): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([photo.path])
  const { error } = await supabase.from('job_photos').delete().eq('id', photo.id)
  if (error) throw error
}
