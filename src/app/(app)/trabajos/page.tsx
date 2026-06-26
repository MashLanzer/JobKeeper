'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { JobCard } from '@/components/jobs/job-card'
import { JobFiltersBar } from '@/components/jobs/job-filters'
import { useJobs } from '@/hooks/use-jobs'
import type { JobFilters } from '@/services/jobs'

export default function TrabajosPage() {
  const [filters, setFilters] = useState<JobFilters>({})
  const { jobs, loading, error } = useJobs(filters)

  return (
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

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
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
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
