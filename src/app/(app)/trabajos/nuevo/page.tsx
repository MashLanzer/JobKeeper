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
import { getTemplates, deleteTemplate, type JobTemplate } from '@/services/templates'
import { updateJob } from '@/services/jobs'
import { addJobMaterial } from '@/services/job-materials'
import { scheduleJobReminder } from '@/lib/local-notifications'
import { setLastPrice } from '@/lib/job-prefs'
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
  // Extras de duplicación (desglose + materiales) a aplicar tras crear.
  const [dupExtras, setDupExtras] = useState<any>(null)

  useEffect(() => {
    const dup = sessionStorage.getItem('duplicate_job')
    const prefill = sessionStorage.getItem('prefill_job')
    if (dup) {
      sessionStorage.removeItem('duplicate_job')
      setInitialData(JSON.parse(dup))
      const extras = sessionStorage.getItem('duplicate_extras')
      if (extras) {
        sessionStorage.removeItem('duplicate_extras')
        try { setDupExtras(JSON.parse(extras)) } catch { /* ignore */ }
      }
    } else if (prefill) {
      sessionStorage.removeItem('prefill_job')
      setInitialData(JSON.parse(prefill))
      setUsedTemplate(true) // título "Nuevo desde plantilla/agenda", no "Duplicar"
    }
    getTemplates().then(setTemplates).catch(() => {})
    setReady(true)
  }, [])

  const applyTemplate = (t: JobTemplate) => {
    setInitialData(t.data)
    setUsedTemplate(true)
  }

  const handleRemoveTemplate = async (id: string) => {
    try {
      await deleteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      toast.error('No se pudo eliminar la plantilla')
    }
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
      scheduleJobReminder(job)
      // Recuerda el precio por categoría para prellenar el próximo trabajo.
      if (data.category && data.price) setLastPrice(data.category, Number(data.price))
      // Si es duplicado, copia el desglose y los materiales al nuevo trabajo.
      if (dupExtras) {
        try {
          if ((dupExtras.line_items?.length || 0) > 0 || dupExtras.discount || dupExtras.tax_rate) {
            await updateJob(job.id, {
              line_items: dupExtras.line_items || [],
              discount: dupExtras.discount || 0,
              tax_rate: dupExtras.tax_rate || 0,
            })
          }
          for (const m of dupExtras.materials || []) {
            await addJobMaterial({ job_id: job.id, name: m.name, quantity: m.quantity, unit_price: m.unit_price })
          }
        } catch {
          // los datos básicos ya se crearon; los extras son secundarios
        }
      }
      toast.success('Trabajo creado exitosamente')
      router.replace(`/trabajos/${job.id}`)
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
