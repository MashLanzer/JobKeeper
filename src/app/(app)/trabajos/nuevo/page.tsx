'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LayoutTemplate, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JobForm } from '@/components/jobs/job-form'
import { useClients } from '@/hooks/use-clients'
import { useCreateJob } from '@/hooks/use-jobs'
import { getTemplates, removeTemplate, type JobTemplate } from '@/lib/templates'
import { formatCurrency } from '@/lib/utils'
import type { Job } from '@/types'

export default function NuevoTrabajoPage() {
  const router = useRouter()
  const { clients } = useClients()
  const { create, loading } = useCreateJob()
  const [initialData, setInitialData] = useState<Partial<Job> | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [usedTemplate, setUsedTemplate] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('duplicate_job')
    if (raw) {
      sessionStorage.removeItem('duplicate_job')
      setInitialData(JSON.parse(raw))
    }
    setTemplates(getTemplates())
    setReady(true)
  }, [])

  const applyTemplate = (t: JobTemplate) => {
    setInitialData(t.data)
    setUsedTemplate(true)
  }

  const handleRemoveTemplate = (id: string) => {
    removeTemplate(id)
    setTemplates(getTemplates())
  }

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

  const title = initialData
    ? usedTemplate
      ? 'Nuevo desde plantilla'
      : 'Duplicar trabajo'
    : 'Nuevo trabajo'

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      {ready && !initialData && templates.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Usar una plantilla
            </p>
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => applyTemplate(t)}
                    className="flex-1 text-left rounded-lg border border-border px-3 py-2 hover:border-primary/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.data.category} · {formatCurrency(t.data.price)}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground flex-shrink-0"
                    onClick={() => handleRemoveTemplate(t.id)}
                    aria-label="Eliminar plantilla"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ready && (
        <JobForm
          key={initialData ? (usedTemplate ? 'template' : 'duplicate') : 'new'}
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
