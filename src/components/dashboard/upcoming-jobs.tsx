import Link from 'next/link'
import { Clock, MapPin, DollarSign, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { Job } from '@/types'

interface UpcomingJobsProps {
  jobs: Job[]
}

export function UpcomingJobs({ jobs }: UpcomingJobsProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos trabajos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay trabajos programados
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Próximos trabajos</CardTitle>
          <Link href="/trabajos" className="text-xs text-primary hover:underline">
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/trabajos/${job.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground truncate">{job.title}</h4>
                  <JobStatusBadge status={job.status} />
                </div>
                <div className="space-y-0.5">
                  {job.scheduled_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(job.scheduled_at)}</span>
                    </div>
                  )}
                  {job.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{job.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-money">
                  {formatCurrency(job.price)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
