'use client'

import Link from 'next/link'
import { MapPin, Clock, DollarSign, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { categoryStyle } from '@/lib/categories'
import type { Job } from '@/types'

interface JobCardProps {
  job: Job
}

function PaymentBadge({ price, deposit }: { price: number; deposit: number }) {
  if (price > 0 && deposit >= price) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 whitespace-nowrap">
        Pagado
      </span>
    )
  }
  if (deposit > 0) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 whitespace-nowrap">
        Anticipo
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
      Sin cobrar
    </span>
  )
}

function isOverdue(job: Job) {
  return (
    job.scheduled_at &&
    new Date(job.scheduled_at) < new Date() &&
    (job.status === 'pendiente' || job.status === 'en_progreso')
  )
}

export function JobCard({ job }: JobCardProps) {
  const overdue = isOverdue(job)
  return (
    <Link href={`/trabajos/${job.id}`}>
      <Card className={cn(
        'hover:border-primary/50 transition-colors active:scale-[0.99]',
        overdue && 'border-destructive/40 bg-destructive/[0.02]'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                {overdue && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive whitespace-nowrap flex-shrink-0">
                    Vencido
                  </span>
                )}
              </div>
              <span className={cn(
                'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1',
                categoryStyle(job.category).chip
              )}>
                {job.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PaymentBadge price={job.price} deposit={job.deposit} />
              <JobStatusBadge status={job.status} />
            </div>
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
