'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, MapPin, Clock, DollarSign, User, Tag, FileText, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useJob } from '@/hooks/use-jobs'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { job, loading, error, remove } = useJob(id)

  const handleDelete = async () => {
    try {
      await remove()
      toast.success('Trabajo eliminado')
      router.push('/trabajos')
    } catch {
      toast.error('Error al eliminar el trabajo')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 page-transition">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error || 'Trabajo no encontrado'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    )
  }

  const pending = job.price - job.deposit

  return (
    <div className="space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold leading-tight">{job.title}</h1>
            <p className="text-xs text-muted-foreground">{job.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/trabajos/${id}/editar`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Eliminar trabajo"
            description={`¿Estás seguro de que quieres eliminar "${job.title}"? Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <JobStatusBadge status={job.status} />
        {job.payment_method && (
          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            {job.payment_method}
          </span>
        )}
      </div>

      {/* Main info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {job.client && (
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <Link href={`/clientes/${job.client_id}`} className="text-sm font-medium text-primary">
                  {job.client.name}
                </Link>
              </div>
            </div>
          )}

          {job.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="text-sm">{job.address}</p>
              </div>
            </div>
          )}

          {job.scheduled_at && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha programada</p>
                <p className="text-sm">{formatDateTime(job.scheduled_at)}</p>
              </div>
            </div>
          )}

          {job.completed_at && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Completado el</p>
                <p className="text-sm">{formatDateTime(job.completed_at)}</p>
              </div>
            </div>
          )}

          {job.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="text-sm whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>
          )}

          {job.notes && (
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Resumen financiero
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Precio total</span>
              <span className="font-semibold text-green-500">{formatCurrency(job.price)}</span>
            </div>
            {job.deposit > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Anticipo recibido</span>
                  <span className="font-medium">{formatCurrency(job.deposit)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendiente por cobrar</span>
                  <span className={`font-semibold ${pending > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {formatCurrency(pending)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit button */}
      <Button asChild className="w-full">
        <Link href={`/trabajos/${id}/editar`}>
          <Edit className="h-4 w-4 mr-2" />
          Editar trabajo
        </Link>
      </Button>
    </div>
  )
}
