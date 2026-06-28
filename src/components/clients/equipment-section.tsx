'use client'

import { useEffect, useState } from 'react'
import { AirVent, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getEquipmentForClient,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  type EquipmentInput,
} from '@/services/equipment'
import { formatDate } from '@/lib/utils'
import type { Equipment, Job } from '@/types'

const EMPTY: EquipmentInput = {
  client_id: '',
  label: '',
  brand: '',
  model: '',
  serial: '',
  btu: '',
  location: '',
  install_date: '',
  notes: '',
}

export function EquipmentSection({ clientId, jobs = [] }: { clientId: string; jobs?: Job[] }) {
  const [items, setItems] = useState<Equipment[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [form, setForm] = useState<EquipmentInput>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getEquipmentForClient(clientId).then(setItems).catch(() => {})
  }, [clientId])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY, client_id: clientId })
    setOpen(true)
  }

  const openEdit = (e: Equipment) => {
    setEditing(e)
    setForm({
      client_id: clientId,
      label: e.label,
      brand: e.brand || '',
      model: e.model || '',
      serial: e.serial || '',
      btu: e.btu || '',
      location: e.location || '',
      install_date: e.install_date || '',
      notes: e.notes || '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Ponle un nombre al equipo (ej. "Sala")')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, install_date: form.install_date || null }
      if (editing) {
        const updated = await updateEquipment(editing.id, payload)
        setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)))
      } else {
        const created = await createEquipment(payload)
        setItems((prev) => [...prev, created])
      }
      setOpen(false)
      toast.success(editing ? 'Equipo actualizado' : 'Equipo agregado')
    } catch {
      toast.error('Error al guardar el equipo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEquipment(id)
      setItems((prev) => prev.filter((it) => it.id !== id))
      toast.success('Equipo eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <AirVent className="h-4 w-4" />
          Equipos ({items.length})
        </CardTitle>
        <Button size="sm" variant="outline" className="h-8" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Registra los equipos de A/C de este cliente (marca, modelo, serie).
          </p>
        ) : (
          items.map((e) => {
            const services = jobs
              .filter((j) => j.equipment_id === e.id)
              .sort((a, b) => {
                const da = new Date(a.scheduled_at || a.created_at).getTime()
                const db = new Date(b.scheduled_at || b.created_at).getTime()
                return db - da
              })
            const last = services[0]
            return (
            <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{e.label}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.brand, e.model, e.btu].filter(Boolean).join(' · ') || 'Sin detalles'}
                </p>
                {e.serial && <p className="text-xs text-muted-foreground">Serie: {e.serial}</p>}
                {e.location && <p className="text-xs text-muted-foreground">Ubicación: {e.location}</p>}
                {e.install_date && (
                  <p className="text-xs text-muted-foreground">Instalado: {formatDate(e.install_date)}</p>
                )}
                <p className="text-xs text-primary mt-1">
                  {services.length === 0
                    ? 'Sin servicios registrados'
                    : `${services.length} servicio${services.length !== 1 ? 's' : ''}${last ? ` · último ${formatDate(last.scheduled_at || last.created_at)}` : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  }
                  title="Eliminar equipo"
                  description={`¿Eliminar "${e.label}"?`}
                  confirmLabel="Eliminar"
                  onConfirm={() => handleDelete(e.id)}
                />
              </div>
            </div>
            )
          })
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre / ubicación *</Label>
              <Input
                placeholder='Ej: "Sala" o "Minisplit recámara"'
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Marca</Label>
                <Input value={form.brand || ''} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <Input value={form.model || ''} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Serie</Label>
                <Input value={form.serial || ''} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Capacidad (BTU/ton)</Label>
                <Input value={form.btu || ''} onChange={(e) => setForm((f) => ({ ...f, btu: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Ubicación</Label>
                <Input value={form.location || ''} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Instalado el</Label>
                <Input
                  type="date"
                  value={form.install_date || ''}
                  onChange={(e) => setForm((f) => ({ ...f, install_date: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar equipo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
