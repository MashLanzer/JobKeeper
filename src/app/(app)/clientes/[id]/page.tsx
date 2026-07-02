'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, FileText, Briefcase, Trash2, Edit, MessageCircle, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { JobCard } from '@/components/jobs/job-card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DetailSkeleton } from '@/components/shared/loading-skeleton'
import { getClientWithJobs } from '@/services/clients'
import { deleteClient, updateClient } from '@/services/clients'
import { getInitials, formatCurrency, formatDate } from '@/lib/utils'
import { nextDueDate, maintenanceStatus, hasMaintenance } from '@/lib/maintenance'
import { getPaymentsTotalForJobs } from '@/services/payments'
import { getContacts, addContact, deleteContact, type ClientContact } from '@/services/client-contacts'
import { getSettings, businessNameOf } from '@/services/settings'
import type { Client, Job } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ClientForm } from '@/components/clients/client-form'
import { EquipmentSection } from '@/components/clients/equipment-section'
import { ClientDocuments } from '@/components/clients/client-documents'
import { TagEditor } from '@/components/shared/tag-editor'

export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const [maintMonths, setMaintMonths] = useState('')
  const [maintLast, setMaintLast] = useState('')
  const [maintSaving, setMaintSaving] = useState(false)
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [paymentsMap, setPaymentsMap] = useState<Record<string, number>>({})
  const [generatingStatement, setGeneratingStatement] = useState(false)
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [contactNote, setContactNote] = useState('')
  const [clientTags, setClientTags] = useState<string[]>([])

  useEffect(() => {
    const loadClient = async () => {
      try {
        const data = await getClientWithJobs(id)
        setClient(data.client)
        const clientJobs = data.jobs as Job[]
        setJobs(clientJobs)
        if (data.client?.maintenance_months) setMaintMonths(String(data.client.maintenance_months))
        if (data.client?.last_service_date) setMaintLast(data.client.last_service_date)

        const ids = clientJobs.filter((j) => j.status !== 'cancelado').map((j) => j.id)
        const totals = await getPaymentsTotalForJobs(ids)
        setPaymentsMap(totals)
        setPaymentsTotal(Object.values(totals).reduce((s, v) => s + v, 0))
      } catch {
        toast.error('Error al cargar el cliente')
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [id])

  const handleGenerateStatement = async () => {
    if (!client) return
    setGeneratingStatement(true)
    try {
      const settings = await getSettings()
      const businessName = businessNameOf(settings)
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 14

      doc.setFillColor(99, 102, 241)
      doc.rect(0, 0, pageW, 26, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(businessName, margin, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Estado de cuenta', pageW - margin, 16, { align: 'right' })

      doc.setTextColor(30, 30, 30)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(client.name, margin, 38)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(110, 110, 110)
      let y = 44
      if (client.phone) { doc.text(client.phone, margin, y); y += 5 }
      if (client.email) { doc.text(client.email, margin, y); y += 5 }
      doc.text(`Emitido: ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}`, margin, y)

      const active = jobs.filter((j) => j.status !== 'cancelado')
      let totalBilled = 0
      let totalCollected = 0
      const body = active.map((j) => {
        const collected = Number(j.deposit) + (paymentsMap[j.id] || 0)
        const pending = Number(j.price) - collected
        totalBilled += Number(j.price)
        totalCollected += collected
        return [
          j.title,
          j.scheduled_at ? formatDate(j.scheduled_at) : formatDate(j.created_at),
          formatCurrency(Number(j.price)),
          formatCurrency(collected),
          formatCurrency(pending),
        ]
      })

      autoTable(doc, {
        startY: y + 6,
        head: [['Trabajo', 'Fecha', 'Precio', 'Cobrado', 'Pendiente']],
        body,
        foot: [[
          'TOTAL',
          '',
          formatCurrency(totalBilled),
          formatCurrency(totalCollected),
          formatCurrency(totalBilled - totalCollected),
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
        footStyles: { fillColor: [238, 238, 248], textColor: [30, 30, 30], fontStyle: 'bold' },
      })

      const safeName = client.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      doc.save(`estado-cuenta-${safeName}.pdf`)
      toast.success('Estado de cuenta descargado')
    } catch {
      toast.error('Error al generar el estado de cuenta')
    } finally {
      setGeneratingStatement(false)
    }
  }

  const handleSaveMaintenance = async () => {
    const months = Number(maintMonths)
    if (!months || months < 1) {
      toast.error('Indica cada cuántos meses (mínimo 1)')
      return
    }
    if (!maintLast) {
      toast.error('Indica la fecha del último servicio')
      return
    }
    setMaintSaving(true)
    try {
      const updated = await updateClient(id, {
        maintenance_months: months,
        last_service_date: maintLast,
      })
      setClient(updated)
      toast.success('Plan de mantenimiento guardado')
    } catch {
      toast.error('Error al guardar el plan')
    } finally {
      setMaintSaving(false)
    }
  }

  const handleRemoveMaintenance = async () => {
    setMaintSaving(true)
    try {
      const updated = await updateClient(id, {
        maintenance_months: null,
        last_service_date: null,
      })
      setClient(updated)
      setMaintMonths('')
      setMaintLast('')
      toast.success('Plan de mantenimiento eliminado')
    } catch {
      toast.error('Error al eliminar el plan')
    } finally {
      setMaintSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteClient(id)
      toast.success('Cliente eliminado')
      router.push('/clientes')
    } catch {
      toast.error('Error al eliminar el cliente')
    }
  }

  // Bitácora de contacto
  useEffect(() => {
    getContacts(id).then(setContacts).catch(() => {})
  }, [id])

  // Etiquetas del cliente
  useEffect(() => {
    if (client) setClientTags(client.tags ?? [])
  }, [client])

  const saveClientTags = async (next: string[]) => {
    setClientTags(next)
    try {
      const updated = await updateClient(id, { tags: next })
      setClient(updated)
    } catch {
      toast.error('No se pudieron guardar las etiquetas')
    }
  }

  const logContact = async (kind: string, note?: string) => {
    const created = await addContact(id, kind, note)
    if (created) setContacts((prev) => [created, ...prev])
  }

  const handleAddNote = async () => {
    if (!contactNote.trim()) return
    await logContact('nota', contactNote.trim())
    setContactNote('')
  }

  const handleDeleteContact = async (cId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== cId))
    await deleteContact(cId)
  }

  // Agenda un mantenimiento prellenado para este cliente.
  const scheduleMaintenance = () => {
    if (!client) return
    sessionStorage.setItem(
      'prefill_job',
      JSON.stringify({
        title: 'Mantenimiento A/C',
        category: 'A/C - Mantenimiento',
        client_id: id,
        address: client.address || '',
      })
    )
    router.push('/trabajos/nuevo')
  }

  const handleEdit = async (data: any) => {
    try {
      setEditLoading(true)
      const updated = await updateClient(id, data)
      setClient(updated)
      setEditOpen(false)
      toast.success('Cliente actualizado')
    } catch {
      toast.error('Error al actualizar el cliente')
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Cliente</h1>
        </div>
        <div className="flex items-center gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar cliente</DialogTitle>
              </DialogHeader>
              <ClientForm
                initialData={client}
                onSubmit={handleEdit}
                isLoading={editLoading}
                submitLabel="Guardar cambios"
              />
            </DialogContent>
          </Dialog>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Eliminar cliente"
            description={`¿Estás seguro de que quieres eliminar a "${client.name}"?`}
            confirmLabel="Eliminar"
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {/* Client info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-xs text-muted-foreground">
                {jobs.length} trabajo{jobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {(client.phone || client.email) && (
            <div className="flex gap-2 mb-4">
              {client.phone && (
                <Button asChild variant="outline" className="flex-1 h-10" size="sm">
                  <a href={`tel:${client.phone}`} onClick={() => logContact('llamada')}>
                    <Phone className="h-4 w-4 mr-1.5" />
                    Llamar
                  </a>
                </Button>
              )}
              {client.phone && (
                <Button asChild variant="outline" className="flex-1 h-10 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950" size="sm">
                  <a href={`https://wa.me/${client.phone.replace(/[^\d+]/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => logContact('whatsapp')}>
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {client.email && (
                <Button asChild variant="outline" className="flex-1 h-10" size="sm">
                  <a href={`mailto:${client.email}`} onClick={() => logContact('email')}>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            {client.phone && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                {client.phone}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                {client.email}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className="flex items-start gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{client.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Etiquetas */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Etiquetas</p>
          <TagEditor tags={clientTags} onChange={saveClientTags} placeholder="VIP, frecuente, moroso…" />
        </CardContent>
      </Card>

      {/* Maintenance plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Plan de mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={scheduleMaintenance} size="sm" variant="outline" className="w-full">
            <Wrench className="h-4 w-4 mr-2" />
            Agendar mantenimiento
          </Button>

          {client && hasMaintenance(client) && (() => {
            const months = client.maintenance_months as number
            const last = client.last_service_date as string
            const due = nextDueDate(last, months)
            const status = maintenanceStatus(last, months)
            const styles = {
              due: 'bg-destructive/10 text-destructive',
              soon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
            }[status]
            const label = { due: 'Vencido', soon: 'Próximo', ok: 'Al día' }[status]
            return (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Próximo servicio</p>
                  <p className="text-sm font-semibold">{formatDate(due.toISOString())}</p>
                  <p className="text-xs text-muted-foreground">cada {months} meses</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles}`}>{label}</span>
              </div>
            )
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maintMonths" className="text-xs">Cada (meses)</Label>
              <Input
                id="maintMonths"
                type="number"
                min="1"
                placeholder="Ej: 6"
                value={maintMonths}
                onChange={(e) => setMaintMonths(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maintLast" className="text-xs">Último servicio</Label>
              <Input
                id="maintLast"
                type="date"
                value={maintLast}
                onChange={(e) => setMaintLast(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveMaintenance} size="sm" className="flex-1" disabled={maintSaving}>
              {client && hasMaintenance(client) ? 'Actualizar plan' : 'Guardar plan'}
            </Button>
            {client && hasMaintenance(client) && (
              <Button onClick={handleRemoveMaintenance} size="sm" variant="ghost" className="text-destructive" disabled={maintSaving}>
                Quitar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <EquipmentSection clientId={id} jobs={jobs} />

      {/* Documentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientDocuments clientId={id} />
        </CardContent>
      </Card>

      {/* Bitácora de contacto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Bitácora de contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Anotar nota, acuerdo, llamada..."
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote() }}
            />
            <Button size="sm" onClick={handleAddNote} disabled={!contactNote.trim()}>Anotar</Button>
          </div>
          {contacts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin registros. Llamadas y mensajes se anotan solos.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 text-sm group">
                  <div className="min-w-0">
                    <p className="capitalize">
                      <span className="text-muted-foreground">{c.kind}</span>
                      {c.note ? ` · ${c.note}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(c.id)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    aria-label="Eliminar registro"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial balance */}
      {jobs.length > 0 && (() => {
        const activeJobs = jobs.filter(j => j.status !== 'cancelado')
        const totalBilled = activeJobs.reduce((s, j) => s + Number(j.price), 0)
        const totalCollected = activeJobs.reduce((s, j) => s + Number(j.deposit), 0) + paymentsTotal
        const balance = totalBilled - totalCollected
        const completedCount = activeJobs.filter((j) => j.status === 'completado').length
        const avgTicket = activeJobs.length > 0 ? totalBilled / activeJobs.length : 0
        // Antigüedad y último servicio (contexto de la relación).
        const dateOf = (j: Job) => j.scheduled_at || j.created_at
        const firstDate = activeJobs
          .map(dateOf)
          .filter(Boolean)
          .sort()[0]
        const lastServiceDate = activeJobs
          .filter((j) => j.status === 'completado')
          .map((j) => j.completed_at || dateOf(j))
          .filter(Boolean)
          .sort()
          .slice(-1)[0]
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Balance financiero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicios</span>
                <span className="font-medium">{activeJobs.length} ({completedCount} completados)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket promedio</span>
                <span className="font-medium">{formatCurrency(avgTicket)}</span>
              </div>
              {firstDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente desde</span>
                  <span className="font-medium">{formatDate(firstDate)}</span>
                </div>
              )}
              {lastServiceDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último servicio</span>
                  <span className="font-medium">{formatDate(lastServiceDate)}</span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total facturado (de por vida)</span>
                <span className="font-semibold">{formatCurrency(totalBilled)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cobrado</span>
                <span className="font-medium text-money">{formatCurrency(totalCollected)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo pendiente</span>
                <span className={`font-bold ${balance > 0 ? 'text-pending' : 'text-money'}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={handleGenerateStatement}
                disabled={generatingStatement}
              >
                <FileText className="h-4 w-4 mr-2" />
                {generatingStatement ? 'Generando...' : 'Estado de cuenta PDF'}
              </Button>
            </CardContent>
          </Card>
        )
      })()}

      {/* Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Trabajos ({jobs.length})
          </h3>
          <Button asChild size="sm" variant="outline">
            <Link href={`/trabajos/nuevo?client_id=${id}`}>Nuevo trabajo</Link>
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Este cliente no tiene trabajos registrados
          </p>
        ) : (
          <div className="space-y-5">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
