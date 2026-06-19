'use client'

import Link from 'next/link'
import { MapPin, Clock, DollarSign, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Job } from '@/types'

interface JobCardProps {
  job: Job
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/trabajos/${job.id}`}>
      <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{job.category}</p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>

          <div className="space-y-1.5">
            {job.client && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{job.client.name}</span>
              </div>
            )}

            {job.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{job.address}</span>
              </div>
            )}

            {job.scheduled_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{formatDateTime(job.scheduled_at)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <DollarSign className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              <span>{formatCurrency(job.price)}</span>
              {job.deposit > 0 && (
                <span className="text-xs text-muted-foreground">
                  (anticipo: {formatCurrency(job.deposit)})
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
