import { Badge } from '@/components/ui/badge'
import type { JobStatus } from '@/types'
import { cn } from '@/lib/utils'

const statusConfig: Record<JobStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'error' }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  en_progreso: { label: 'En Progreso', variant: 'info' },
  completado: { label: 'Completado', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'error' },
}

interface JobStatusBadgeProps {
  status: JobStatus
  className?: string
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}
