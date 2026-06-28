'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { JobForm } from '@/components/jobs/job-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useJob } from '@/hooks/use-jobs'
import { useClients } from '@/hooks/use-clients'
import { updateJob } from '@/services/jobs'
import { scheduleJobReminder } from '@/lib/local-notifications'

export default function EditarTrabajoPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { job, loading } = useJob(id)
  const { clients } = useClients()

  const handleSubmit = async (data: any) => {
    try {
      const completedAt = data.status === 'completado' && !job?.completed_at
        ? new Date().toISOString()
        : job?.completed_at

      await updateJob(id, {
        ...data,
        client_id: data.client_id || null,
        scheduled_at: data.scheduled_at || null,
        payment_method: data.payment_method || null,
        completed_at: data.status === 'completado' ? completedAt : null,
      })
      // Reprograma (o cancela) el recordatorio según la nueva fecha.
      scheduleJobReminder({ id, title: data.title, scheduled_at: data.scheduled_at || null })
      toast.success('Trabajo actualizado')
      // replace (no push): así "atrás" desde el detalle no vuelve al formulario
      router.replace(`/trabajos/${id}`)
    } catch {
      toast.error('Error al actualizar el trabajo')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Editar trabajo</h1>
      </div>

      {job && (
        <JobForm
          initialData={job}
          clients={clients}
          onSubmit={handleSubmit}
          submitLabel="Guardar cambios"
        />
      )}
    </div>
  )
}
