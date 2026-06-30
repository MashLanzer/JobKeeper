'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Minus, Trash2, Edit, AlertTriangle, Search, X, ShoppingCart } from 'lucide-react'
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
import { addMovement, getMovements, type MaterialMovement } from '@/services/material-movements'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Material } from '@/types'

const EMPTY: MaterialInput = { name: '', unit: '', price: 0, stock: 0, min_stock: 0, supplier: '', notes: '' }

export default function MaterialesPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [form, setForm] = useState<MaterialInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [histMaterial, setHistMaterial] = useState<Material | null>(null)
  const [movements, setMovements] = useState<MaterialMovement[]>([])

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
    setNameError(false)
    setOpen(true)
  }

  const openEdit = (m: Material) => {
    setEditing(m)
    setNameError(false)
    setForm({
      name: m.name,
      unit: m.unit || '',
      price: Number(m.price),
      stock: Number(m.stock),
      min_stock: Number(m.min_stock),
      supplier: m.supplier || '',
      notes: m.notes || '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError(true)
      toast.error('El nombre es requerido')
      return
    }
    setNameError(false)
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

  // Ajuste rápido de stock (+/−) sin abrir el editor. Optimista con rollback.
  const adjustStock = async (m: Material, delta: number) => {
    const next = Math.max(0, Number(m.stock) + delta)
    if (next === Number(m.stock)) return
    setMaterials((prev) => prev.map((it) => (it.id === m.id ? { ...it, stock: next } : it)))
    try {
      await updateMaterial(m.id, { stock: next })
      addMovement(m.id, delta, delta > 0 ? 'compra' : 'uso')
    } catch {
      setMaterials((prev) => prev.map((it) => (it.id === m.id ? { ...it, stock: m.stock } : it)))
      toast.error('No se pudo actualizar el stock')
    }
  }

  const openHistory = async (m: Material) => {
    setHistMaterial(m)
    setMovements([])
    setMovements(await getMovements(m.id))
  }

  const isLow = (m: Material) => Number(m.stock) <= Number(m.min_stock) && Number(m.min_stock) > 0

  // Genera y comparte (WhatsApp) la lista de compra de los materiales bajos.
  const shareShoppingList = () => {
    const low = materials.filter(isLow)
    if (low.length === 0) return
    const lines = low.map((m) => {
      const need = Math.max(0, Number(m.min_stock) - Number(m.stock))
      return `• ${m.name} — tengo ${Number(m.stock)}${m.unit ? ` ${m.unit}` : ''}, mín ${Number(m.min_stock)}${need > 0 ? ` (faltan ${need})` : ''}${m.supplier ? ` · ${m.supplier}` : ''}`
    })
    const text = `Lista de compra:\n${lines.join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }
  const lowStock = materials.filter(isLow)
  const inventoryValue = materials.reduce((s, m) => s + Number(m.stock) * Number(m.price), 0)

  const term = search.trim().toLowerCase()
  const filtered = materials.filter(
    (m) => (!lowOnly || isLow(m)) && (!term || m.name.toLowerCase().includes(term))
  )

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Materiales"
        description={
          inventoryValue > 0
            ? `${materials.length} material${materials.length !== 1 ? 'es' : ''} · valor ${formatCurrency(inventoryValue)}`
            : `${materials.length} material${materials.length !== 1 ? 'es' : ''}`
        }
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        }
      />

      {materials.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {lowStock.length > 0 && (
        <button
          onClick={() => setLowOnly((v) => !v)}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-colors text-left',
            lowOnly
              ? 'border-amber-500/60 bg-amber-500/20'
              : 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
          )}
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-pending flex-1">
            {lowStock.length} material{lowStock.length !== 1 ? 'es' : ''} con stock bajo
          </p>
          <span className="text-xs font-medium text-pending">
            {lowOnly ? 'Ver todos' : 'Ver solo bajos'}
          </span>
        </button>
      )}

      {lowStock.length > 0 && (
        <Button variant="outline" size="sm" className="w-full" onClick={shareShoppingList}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Compartir lista de compra
        </Button>
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
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {lowOnly ? 'Ningún material con stock bajo' : 'Sin resultados'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((m) => {
            const low = isLow(m)
            return (
              <Card key={m.id} className={low ? 'border-amber-500/40' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => openHistory(m)}>
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {Number(m.stock)}{m.unit ? ` ${m.unit}` : ''}
                      {low && <span className="text-pending font-medium"> · bajo</span>}
                      {Number(m.price) > 0 && <> · {formatCurrency(Number(m.price))}</>}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Ver historial</p>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Ajuste rápido de stock */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustStock(m, -1)}
                      disabled={Number(m.stock) <= 0}
                      aria-label="Restar stock"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">{Number(m.stock)}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustStock(m, 1)}
                      aria-label="Sumar stock"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
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
              <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ej: Gas refrigerante R-410A"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  if (nameError && e.target.value.trim()) setNameError(false)
                }}
                className={nameError ? 'border-destructive focus-visible:ring-destructive/40' : ''}
              />
              {nameError && <p className="text-xs text-destructive">Este campo es requerido.</p>}
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
            <div className="space-y-1.5">
              <Label className="text-xs">Proveedor</Label>
              <Input
                placeholder="Ej: Distribuidora Polar"
                value={form.supplier || ''}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar material'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Historial de movimientos */}
      <Dialog open={!!histMaterial} onOpenChange={(o) => !o && setHistMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimientos · {histMaterial?.name}</DialogTitle>
          </DialogHeader>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin movimientos registrados.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {movements.map((mv) => (
                <div key={mv.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                  <div className="min-w-0">
                    <p className="capitalize">{mv.reason || 'ajuste'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(mv.created_at)}</p>
                  </div>
                  <span className={cn('font-semibold', Number(mv.delta) >= 0 ? 'text-money' : 'text-destructive')}>
                    {Number(mv.delta) >= 0 ? '+' : ''}{Number(mv.delta)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
