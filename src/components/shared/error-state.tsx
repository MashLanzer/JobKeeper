'use client'

import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar la información. Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center page-transition', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-destructive/10 blur-xl" />
        <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-destructive/15 to-destructive/5 flex items-center justify-center ring-1 ring-destructive/10">
          <AlertTriangle className="h-9 w-9 text-destructive" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
