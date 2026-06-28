'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import type { JobFilters } from '@/services/jobs'

type SortKey = 'reciente' | 'precio' | 'fecha'

export default function TrabajosPage() {
  const [filters, setFilters] = useState<JobFilters>({})
  const [sort, setSort] = useState<SortKey>('reciente')
  const { jobs, loading, error, refetch } = useJobs(filters)

  // Ordena según el criterio elegido; los urgentes siempre quedan primero.
  const sortedJobs = [...jobs].sort((a, b) => {
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

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Trabajos"
        description={`${jobs.length} trabajo${jobs.length !== 1 ? 's' : ''}`}
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
        <div className="flex flex-col gap-4">
          {sortedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
