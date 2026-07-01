'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { JobCard } from '@/components/jobs/job-card'
import { JobFiltersBar } from '@/components/jobs/job-filters'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useJobs } from '@/hooks/use-jobs'
import { updateJob } from '@/services/jobs'
import { getPayments, addPayment } from '@/services/payments'
import { haptic } from '@/lib/haptics'
import { formatCurrency } from '@/lib/utils'
import type { JobFilters } from '@/services/jobs'
import type { Job } from '@/types'

type SortKey = 'reciente' | 'precio' | 'fecha'

export default function TrabajosPage() {
  // Permite preseleccionar el filtro de cobro vía URL (?cobro=sin-cobrar),
  // p.ej. desde la alerta "Completados sin cobrar" del dashboard.
  const [filters, setFilters] = useState<JobFilters>(() => {
    if (typeof window !== 'undefined') {
      const cobro = new URLSearchParams(window.location.search).get('cobro')
      if (cobro === 'sin-cobrar') return { paid: false }
      if (cobro === 'cobrados') return { paid: true }
    }
    return {}
  })
  const [sort, setSort] = useState<SortKey>('reciente')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const { jobs, loading, error, refetch } = useJobs(filters)

  // Etiquetas presentes en los trabajos visibles (para filtrar).
  const allTags = Array.from(new Set(jobs.flatMap((j) => j.tags || []))).sort()
  const tagFiltered = tagFilter ? jobs.filter((j) => (j.tags || []).includes(tagFilter)) : jobs

  // Ordena según el criterio elegido; los urgentes siempre quedan primero.
  const sortedJobs = [...tagFiltered].sort((a, b) => {
    const ua = a.priority === 'urgente' ? 0 : 1
    const ub = b.priority === 'urgente' ? 0 : 1
    if (ua !== ub) return ua - ub
    if (sort === 'precio') return Number(b.price) - Number(a.price)
    if (sort === 'fecha') {
      const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
      const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
      return db - da
    }
    return 0 // "reciente": respeta el orden del servidor (created_at desc)
  })

  // Marca cobrado desde la tarjeta: registra el saldo pendiente (si lo hay)
  // y fija paid_at, considerando los pagos ya existentes.
  const handleMarkPaid = async (job: Job) => {
    try {
      const pays = await getPayments(job.id).catch(() => [])
      const collected = Number(job.deposit) + pays.reduce((s, p) => s + Number(p.amount), 0)
      const pending = Number(job.price) - collected
      if (pending > 0) {
        await addPayment({ job_id: job.id, amount: pending, method: job.payment_method || 'efectivo' })
      }
      await updateJob(job.id, { paid_at: new Date().toISOString() })
      haptic('success')
      toast.success('Trabajo marcado como cobrado')
      refetch()
    } catch {
      toast.error('No se pudo marcar como cobrado')
    }
  }

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Trabajos"
        description={`${tagFiltered.length} trabajo${tagFiltered.length !== 1 ? 's' : ''} · ${formatCurrency(tagFiltered.reduce((s, j) => s + Number(j.price), 0))}`}
        action={
          <Button asChild size="sm">
            <Link href="/trabajos/nuevo">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Link>
          </Button>
        }
      />

      <JobFiltersBar filters={filters} onChange={setFilters} />

      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap bg-muted text-muted-foreground hover:text-foreground"
            >
              ✕ etiqueta
            </button>
          )}
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                tagFilter === t ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {jobs.length > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-8 w-auto gap-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reciente">Más reciente</SelectItem>
              <SelectItem value="fecha">Fecha programada</SelectItem>
              <SelectItem value="precio">Mayor precio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Sin trabajos"
          description={
            Object.keys(filters).length > 0
              ? 'No se encontraron trabajos con los filtros seleccionados'
              : 'Crea tu primer trabajo para comenzar a registrar tu actividad'
          }
          action={
            Object.keys(filters).length === 0 ? (
              <Button asChild>
                <Link href="/trabajos/nuevo">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer trabajo
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4 stagger-in">
          {sortedJobs.map((job) => (
            <JobCard key={job.id} job={job} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
