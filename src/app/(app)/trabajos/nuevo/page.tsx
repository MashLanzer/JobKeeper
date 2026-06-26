'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { JobForm } from '@/components/jobs/job-form'
import { useClients } from '@/hooks/use-clients'
import { useCreateJob } from '@/hooks/use-jobs'
import type { Job } from '@/types'

export default function NuevoTrabajoPage() {
  const router = useRouter()
  const { clients } = useClients()
  const { create, loading } = useCreateJob()
  const [initialData, setInitialData] = useState<Partial<Job> | undefined>(undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('duplicate_job')
    if (raw) {
      sessionStorage.removeItem('duplicate_job')
      setInitialData(JSON.parse(raw))
    }
    setReady(true)
  }, [])

  const handleSubmit = async (data: any) => {
    try {
      const job = await create({
        ...data,
        client_id: data.client_id || null,
        scheduled_at: data.scheduled_at || null,
        payment_method: data.payment_method || null,
        completed_at: null,
      })
      toast.success('Trabajo creado exitosamente')
      router.push(`/trabajos/${job.id}`)
    } catch {
      toast.error('Error al crear el trabajo')
    }
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">
          {initialData ? 'Duplicar trabajo' : 'Nuevo trabajo'}
        </h1>
      </div>

      {ready && (
        <JobForm
          key={initialData ? 'duplicate' : 'new'}
          initialData={initialData}
          clients={clients}
          onSubmit={handleSubmit}
          isLoading={loading}
          submitLabel="Crear trabajo"
        />
      )}
    </div>
  )
}
