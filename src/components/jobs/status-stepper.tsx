'use client'

import { Fragment } from 'react'
import { Check, X } from 'lucide-react'
import type { JobStatus } from '@/types'
import { cn } from '@/lib/utils'

// "Cobrado" no es un estado: es un paso extra derivado de paid_at, porque
// completar un trabajo y cobrarlo son dos cosas distintas.
const STEPS: { key: string; label: string }[] = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'completado', label: 'Completado' },
  { key: 'cobrado', label: 'Cobrado' },
]

export function StatusStepper({ status, paid = false }: { status: JobStatus; paid?: boolean }) {
  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
        <X className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">Trabajo cancelado</span>
      </div>
    )
  }

  // Si está cobrado, el paso actual es "Cobrado" (índice 3); si no, sigue el estado.
  const currentIndex = status === 'completado' && paid
    ? 3
    : STEPS.findIndex((s) => s.key === status)

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const current = i === currentIndex
        const isLast = i === STEPS.length - 1
        return (
          <Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  done && 'bg-primary text-primary-foreground',
                  current && 'bg-primary/15 text-primary ring-2 ring-primary',
                  !done && !current && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium text-center leading-tight',
                  current ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 h-0.5 mt-4 mx-1 rounded-full">
                <div className={cn('h-full rounded-full', i < currentIndex ? 'bg-primary' : 'bg-muted')} />
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
