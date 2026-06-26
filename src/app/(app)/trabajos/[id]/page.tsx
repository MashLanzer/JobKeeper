'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, MapPin, Clock, DollarSign, User, Tag, FileText, CreditCard, Download } from 'lucide-react'
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
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const handleGeneratePDF = async () => {
    if (!job) return
    setGeneratingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const pageW = doc.internal.pageSize.getWidth()
      const margin = 20
      let y = margin

      // Header
      doc.setFillColor(79, 70, 229)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text('WorkLedger', margin, 17)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('RECIBO DE TRABAJO', pageW - margin, 17, { align: 'right' })

      y = 40

      // Job title
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(job.title, margin, y)
      y += 6

      if (job.category) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(job.category, margin, y)
        y += 5
      }

      y += 4
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      const row = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(label.toUpperCase(), margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        doc.setFontSize(10)
        doc.text(value, margin, y + 4.5)
        y += 12
      }

      // Client section
      if (job.client) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(79, 70, 229)
        doc.text('CLIENTE', margin, y)
        y += 6
        row('Nombre', job.client.name)
        if ((job.client as any).phone) row('Teléfono', (job.client as any).phone)
        if ((job.client as any).email) row('Email', (job.client as any).email)

        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, pageW - margin, y)
        y += 6
      }

      // Job details
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('DETALLES DEL TRABAJO', margin, y)
      y += 6

      if (job.address) row('Dirección', job.address)
      if (job.scheduled_at) row('Fecha programada', formatDateTime(job.scheduled_at))
      if (job.completed_at) row('Fecha completado', formatDateTime(job.completed_at))
      if (job.description) {
        const lines = doc.splitTextToSize(job.description, pageW - margin * 2)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('DESCRIPCIÓN', margin, y)
        y += 4.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(lines, margin, y)
        y += lines.length * 5 + 7
      }

      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      // Financial summary
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('RESUMEN FINANCIERO', margin, y)
      y += 8

      const finRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(10)
        doc.setTextColor(bold ? 30 : 80, bold ? 30 : 80, bold ? 30 : 80)
        doc.text(label, margin, y)
        if (color) doc.setTextColor(...color)
        doc.text(value, pageW - margin, y, { align: 'right' })
        y += 7
      }

      finRow('Precio total', formatCurrency(job.price), true, [22, 163, 74])
      if (job.deposit > 0) {
        finRow('Anticipo recibido', formatCurrency(job.deposit))
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y - 2, pageW - margin, y - 2)
        const pending = job.price - job.deposit
        finRow('Pendiente por cobrar', formatCurrency(pending), true, pending > 0 ? [202, 138, 4] : [22, 163, 74])
      }

      // Footer
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      const genDate = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
      doc.text(`Generado el ${genDate}`, margin, pageH - 10)
      doc.text('WorkLedger', pageW - margin, pageH - 10, { align: 'right' })

      const safeTitle = job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      doc.save(`recibo-${safeTitle}.pdf`)
      toast.success('Recibo generado correctamente')
    } catch {
      toast.error('Error al generar el recibo')
    } finally {
      setGeneratingPdf(false)
    }
  }

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

      {/* Actions */}
      <div className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/trabajos/${id}/editar`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar trabajo
          </Link>
        </Button>
        <Button variant="outline" onClick={handleGeneratePDF} disabled={generatingPdf} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          {generatingPdf ? 'Generando...' : 'Recibo PDF'}
        </Button>
      </div>
    </div>
  )
}
