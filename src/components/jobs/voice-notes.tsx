'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Loader2, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  getJobAudio,
  uploadJobAudio,
  getAudioUrl,
  deleteJobAudio,
  type JobAudio,
} from '@/services/job-audio'
import { haptic } from '@/lib/haptics'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function VoiceNotes({ jobId }: { jobId: string }) {
  const [notes, setNotes] = useState<JobAudio[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const load = async () => {
    const data = await getJobAudio(jobId)
    setNotes(data)
    // URLs firmadas para reproducir.
    const map: Record<string, string> = {}
    await Promise.all(
      data.map(async (n) => {
        const u = await getAudioUrl(n.path)
        if (u) map[n.id] = u
      })
    )
    setUrls(map)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const persistBlob = async (blob: Blob, ext: string) => {
    setBusy(true)
    try {
      const row = await uploadJobAudio(jobId, blob, ext)
      if (!row) {
        toast.error('No se pudo guardar la nota de voz')
        return
      }
      haptic('success')
      toast.success('Nota de voz guardada')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('La grabación no está disponible en este dispositivo')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const ext = (rec.mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm'
        await persistBlob(blob, ext)
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      haptic('light')
    } catch {
      toast.error('Activa el permiso del micrófono para grabar')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      toast.error('El audio debe pesar menos de 15 MB')
      return
    }
    const ext = (file.name.split('.').pop() || 'm4a').toLowerCase()
    await persistBlob(file, ext)
  }

  const handleDelete = async (n: JobAudio) => {
    await deleteJobAudio(n.id, n.path)
    haptic('light')
    setNotes((prev) => prev.filter((x) => x.id !== n.id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {recording ? (
          <Button size="sm" onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white flex-1">
            <Square className="h-4 w-4 mr-1.5" /> Detener grabación
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={startRecording} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mic className="h-4 w-4 mr-1.5" />}
            Grabar nota
          </Button>
        )}
        <Button asChild size="sm" variant="ghost" disabled={busy || recording} aria-label="Adjuntar audio">
          <label className="cursor-pointer">
            <Paperclip className="h-4 w-4" />
            <input type="file" accept="audio/*" className="hidden" onChange={handleFile} />
          </label>
        </Button>
      </div>

      {recording && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> Grabando…
        </p>
      )}

      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin notas de voz. Graba o adjunta un audio.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground mb-1">{formatDate(n.created_at)}</p>
                {urls[n.id] ? (
                  <audio controls preload="none" src={urls[n.id]} className="w-full h-8" />
                ) : (
                  <p className="text-xs text-muted-foreground">Cargando…</p>
                )}
              </div>
              <ConfirmDialog
                title="¿Eliminar nota de voz?"
                description="Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                onConfirm={() => handleDelete(n)}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
