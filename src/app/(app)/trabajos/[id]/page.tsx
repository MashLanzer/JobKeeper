'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, MapPin, Clock, DollarSign, User, Tag, FileText, CreditCard, Copy, ClipboardList, Share2, CheckCircle2, Play, Navigation, Circle, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useJob } from '@/hooks/use-jobs'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getBusinessInfo } from '@/lib/business'
import { sharePdf } from '@/lib/share-pdf'
import { nextFolio } from '@/lib/folio'
import { getChecklist, saveChecklist, type ChecklistItem } from '@/lib/checklist'
import { getSignature, saveSignature, removeSignature } from '@/lib/signature'
import { SignaturePad } from '@/components/jobs/signature-pad'
import { saveTemplate } from '@/lib/templates'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { job, loading, error, remove, update } = useJob(id)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [signature, setSignature] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      setChecklist(getChecklist(id))
      setSignature(getSignature(id))
    }
  }, [id])

  const toggleChecklistItem = (index: number) => {
    setChecklist((prev) => {
      const next = prev.map((it, i) => (i === index ? { ...it, done: !it.done } : it))
      saveChecklist(id, next)
      return next
    })
  }

  const handleGeneratePDF = async () => {
    if (!job) return
    setGeneratingPdf(true)
    try {
      const business = getBusinessInfo()
      const businessName = business.name.trim() || 'WorkLedger'
      const contact = [business.phone, business.email].filter(Boolean).join('   ·   ')

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
      const folio = nextFolio('recibo')
      let nameX = margin
      if (business.logo) {
        try {
          const fmt = business.logo.substring(business.logo.indexOf('/') + 1, business.logo.indexOf(';')).toUpperCase()
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(margin, 5, 18, 18, 2, 2, 'F')
          doc.addImage(business.logo, fmt, margin + 1, 6, 16, 16)
          nameX = margin + 22
        } catch {
          // logo inválido: se omite
        }
      }
      doc.text(businessName, nameX, 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`RECIBO #${folio}`, pageW - margin, 15, { align: 'right' })
      if (contact) {
        doc.setFontSize(8)
        doc.text(contact, nameX, 22)
      }

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

      // Tareas realizadas (checklist)
      const doneTasks = checklist.filter((i) => i.done)
      if (doneTasks.length > 0) {
        y += 4
        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, pageW - margin, y)
        y += 6
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(79, 70, 229)
        doc.text('TAREAS REALIZADAS', margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doneTasks.forEach((t) => {
          doc.text(`•  ${t.label}`, margin, y)
          y += 6
        })
      }

      // Firma del cliente
      if (signature) {
        try {
          y += 6
          doc.addImage(signature, 'PNG', margin, y, 50, 22)
          y += 24
          doc.setDrawColor(150, 150, 150)
          doc.line(margin, y, margin + 50, y)
          y += 4
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(120, 120, 120)
          doc.text('Firma del cliente', margin, y)
        } catch {
          // firma inválida: se omite
        }
      }

      // Footer
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      const genDate = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
      doc.text(`Generado el ${genDate}`, margin, pageH - 10)
      doc.text(businessName, pageW - margin, pageH - 10, { align: 'right' })

      const safeTitle = job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const result = await sharePdf(doc, `recibo-${safeTitle}.pdf`, `Recibo - ${job.title}`)
      toast.success(result === 'shared' ? 'Recibo listo para enviar' : 'Recibo descargado')
    } catch {
      toast.error('Error al generar el recibo')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSaveTemplate = () => {
    if (!job) return
    const name = window.prompt('Nombre de la plantilla', job.title)
    if (!name || !name.trim()) return
    saveTemplate(name.trim(), {
      title: job.title,
      description: job.description || '',
      address: job.address || '',
      category: job.category,
      price: job.price,
      payment_method: job.payment_method || '',
      notes: job.notes || '',
    })
    toast.success('Plantilla guardada')
  }

  const handleDuplicate = () => {
    if (!job) return
    const data = {
      title: `${job.title} (copia)`,
      description: job.description || '',
      address: job.address || '',
      category: job.category,
      client_id: job.client_id || undefined,
      price: job.price,
      deposit: 0,
      status: 'pendiente',
      payment_method: job.payment_method || '',
      notes: job.notes || '',
    }
    sessionStorage.setItem('duplicate_job', JSON.stringify(data))
    router.push('/trabajos/nuevo')
  }

  const handleGenerateQuote = async () => {
    if (!job) return
    setGeneratingQuote(true)
    try {
      const business = getBusinessInfo()
      const businessName = business.name.trim() || 'WorkLedger'
      const contact = [business.phone, business.email].filter(Boolean).join('   ·   ')

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
      const folio = nextFolio('cotizacion')
      let nameX = margin
      if (business.logo) {
        try {
          const fmt = business.logo.substring(business.logo.indexOf('/') + 1, business.logo.indexOf(';')).toUpperCase()
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(margin, 5, 18, 18, 2, 2, 'F')
          doc.addImage(business.logo, fmt, margin + 1, 6, 16, 16)
          nameX = margin + 22
        } catch {
          // logo inválido: se omite
        }
      }
      doc.text(businessName, nameX, 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`COTIZACIÓN #${folio}`, pageW - margin, 15, { align: 'right' })
      if (contact) {
        doc.setFontSize(8)
        doc.text(contact, nameX, 22)
      }

      y = 40
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

      const dateStr = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(`Fecha: ${dateStr}`, margin, y + 2)
      y += 10

      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      const row = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(label.toUpperCase(), margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(value, margin, y + 4.5)
        y += 12
      }

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

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('DESCRIPCIÓN DEL SERVICIO', margin, y)
      y += 6

      if (job.address) row('Lugar del servicio', job.address)
      if (job.scheduled_at) row('Fecha estimada', formatDateTime(job.scheduled_at))
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

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('PRECIO', margin, y)
      y += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(22, 163, 74)
      doc.text(formatCurrency(job.price), pageW - margin, y, { align: 'right' })
      y += 10

      // Validity note
      doc.setFillColor(245, 245, 255)
      doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(79, 70, 229)
      doc.text('Esta cotización es válida por 30 días a partir de la fecha de emisión.', pageW / 2, y + 8.5, { align: 'center' })

      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generado el ${dateStr}`, margin, pageH - 10)
      doc.text(businessName, pageW - margin, pageH - 10, { align: 'right' })

      const safeTitle = job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const result = await sharePdf(doc, `cotizacion-${safeTitle}.pdf`, `Cotización - ${job.title}`)
      toast.success(result === 'shared' ? 'Cotización lista para enviar' : 'Cotización descargada')
    } catch {
      toast.error('Error al generar la cotización')
    } finally {
      setGeneratingQuote(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!job) return
    setUpdatingStatus(true)
    try {
      await update({ deposit: job.price })
      toast.success('Trabajo marcado como cobrado')
    } catch {
      toast.error('Error al actualizar el cobro')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleChangeStatus = async (status: 'en_progreso' | 'completado') => {
    if (!job) return
    setUpdatingStatus(true)
    try {
      const patch: Record<string, unknown> = { status }
      if (status === 'completado' && !job.completed_at) {
        patch.completed_at = new Date().toISOString()
      }
      await update(patch)
      toast.success(status === 'completado' ? 'Trabajo completado' : 'Trabajo iniciado')
    } catch {
      toast.error('Error al cambiar el estado')
    } finally {
      setUpdatingStatus(false)
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
    <div className="space-y-6 page-transition">
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

      {/* Quick status actions */}
      {job.status !== 'completado' && job.status !== 'cancelado' && (
        <div className="flex gap-2">
          {job.status === 'pendiente' && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleChangeStatus('en_progreso')}
              disabled={updatingStatus}
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() => handleChangeStatus('completado')}
            disabled={updatingStatus}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completar
          </Button>
        </div>
      )}

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
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="text-sm">{job.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-1"
                >
                  <Navigation className="h-3 w-3" />
                  Abrir en mapa
                </a>
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

      {/* Timeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Historial
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Creado', date: job.created_at, done: true },
              { label: 'Programado', date: job.scheduled_at, done: !!job.scheduled_at },
              {
                label: 'Completado',
                date: job.completed_at,
                done: job.status === 'completado',
              },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  />
                  {i < arr.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="-mt-0.5 pb-1">
                  <p className={`text-sm font-medium ${step.done ? '' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.date ? formatDateTime(step.date) : 'Pendiente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service checklist */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Checklist de servicio
            </h3>
            <span className="text-xs text-muted-foreground">
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          </div>
          <div className="space-y-1">
            {checklist.map((item, i) => (
              <button
                key={item.label}
                onClick={() => toggleChecklistItem(i)}
                className="flex items-center gap-3 w-full text-left py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client signature */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Edit className="h-4 w-4 text-primary" />
            Firma del cliente
          </h3>
          <SignaturePad
            initial={signature}
            onSave={(dataUrl) => {
              saveSignature(id, dataUrl)
              setSignature(dataUrl)
              toast.success('Firma guardada')
            }}
            onClear={() => {
              removeSignature(id)
              setSignature(null)
            }}
          />
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

          {pending > 0 && (
            <Button
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkPaid}
              disabled={updatingStatus}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como cobrado ({formatCurrency(pending)})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="col-span-2">
          <Link href={`/trabajos/${id}/editar`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar trabajo
          </Link>
        </Button>
        <Button variant="outline" onClick={handleGeneratePDF} disabled={generatingPdf}>
          <Share2 className="h-4 w-4 mr-2" />
          {generatingPdf ? 'Generando...' : 'Recibo'}
        </Button>
        <Button variant="outline" onClick={handleGenerateQuote} disabled={generatingQuote}>
          <ClipboardList className="h-4 w-4 mr-2" />
          {generatingQuote ? 'Generando...' : 'Cotización'}
        </Button>
        <Button variant="outline" onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </Button>
        <Button variant="outline" onClick={handleSaveTemplate}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Plantilla
        </Button>
      </div>
    </div>
  )
}
