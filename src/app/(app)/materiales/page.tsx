'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Trash2, Edit, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, type MaterialInput } from '@/services/materials'
import { formatCurrency } from '@/lib/utils'
import type { Material } from '@/types'

const EMPTY: MaterialInput = { name: '', unit: '', price: 0, stock: 0, min_stock: 0, notes: '' }

export default function MaterialesPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [form, setForm] = useState<MaterialInput>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setMaterials(await getMaterials())
    } catch {
      toast.error('Error al cargar materiales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (m: Material) => {
    setEditing(m)
    setForm({
      name: m.name,
      unit: m.unit || '',
      price: Number(m.price),
      stock: Number(m.stock),
      min_stock: Number(m.min_stock),
      notes: m.notes || '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateMaterial(editing.id, form)
      } else {
        await createMaterial(form)
      }
      setOpen(false)
      await load()
      toast.success(editing ? 'Material actualizado' : 'Material agregado')
    } catch {
      toast.error('Error al guardar el material')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMaterial(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
      toast.success('Material eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const lowStock = materials.filter((m) => Number(m.stock) <= Number(m.min_stock) && Number(m.min_stock) > 0)

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Materiales"
        description={`${materials.length} material${materials.length !== 1 ? 'es' : ''}`}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        }
      />

      {lowStock.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {lowStock.length} material{lowStock.length !== 1 ? 'es' : ''} con stock bajo
          </p>
        </div>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin materiales"
          description="Registra tus piezas frecuentes (gas, filtros, válvulas) para llevar control de stock"
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar material
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {materials.map((m) => {
            const low = Number(m.stock) <= Number(m.min_stock) && Number(m.min_stock) > 0
            return (
              <Card key={m.id} className={low ? 'border-amber-500/40' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {Number(m.stock)}{m.unit ? ` ${m.unit}` : ''}
                      {low && <span className="text-amber-600 dark:text-amber-400 font-medium"> · bajo</span>}
                      {Number(m.price) > 0 && <> · {formatCurrency(Number(m.price))}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Eliminar material"
                      description={`¿Eliminar "${m.name}"?`}
                      confirmLabel="Eliminar"
                      onConfirm={() => handleDelete(m.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar material' : 'Nuevo material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input
                placeholder="Ej: Gas refrigerante R-410A"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Unidad</Label>
                <Input
                  placeholder="pieza, litro..."
                  value={form.unit || ''}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Precio</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Stock actual</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stock mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar material'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
