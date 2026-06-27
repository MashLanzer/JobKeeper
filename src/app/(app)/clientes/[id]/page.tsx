'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, FileText, Briefcase, Trash2, Edit, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { JobCard } from '@/components/jobs/job-card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getClientWithJobs } from '@/services/clients'
import { deleteClient, updateClient } from '@/services/clients'
import { getInitials, formatCurrency } from '@/lib/utils'
import type { Client, Job } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ClientForm } from '@/components/clients/client-form'

export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    const loadClient = async () => {
      try {
        const data = await getClientWithJobs(id)
        setClient(data.client)
        setJobs(data.jobs as Job[])
      } catch {
        toast.error('Error al cargar el cliente')
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [id])

  const handleDelete = async () => {
    try {
      await deleteClient(id)
      toast.success('Cliente eliminado')
      router.push('/clientes')
    } catch {
      toast.error('Error al eliminar el cliente')
    }
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
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
                  <a href={`tel:${client.phone}`}>
                    <Phone className="h-4 w-4 mr-1.5" />
                    Llamar
                  </a>
                </Button>
              )}
              {client.phone && (
                <Button asChild variant="outline" className="flex-1 h-10 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950" size="sm">
                  <a href={`https://wa.me/${client.phone.replace(/[^\d+]/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {client.email && (
                <Button asChild variant="outline" className="flex-1 h-10" size="sm">
                  <a href={`mailto:${client.email}`}>
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

      {/* Financial balance */}
      {jobs.length > 0 && (() => {
        const activeJobs = jobs.filter(j => j.status !== 'cancelado')
        const totalBilled = activeJobs.reduce((s, j) => s + Number(j.price), 0)
        const totalCollected = activeJobs.reduce((s, j) => s + Number(j.deposit), 0)
        const balance = totalBilled - totalCollected
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Balance financiero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total facturado</span>
                <span className="font-semibold">{formatCurrency(totalBilled)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cobrado</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(totalCollected)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo pendiente</span>
                <span className={`font-bold ${balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
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
