'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Repeat, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getRecurringExpenses,
  createRecurringExpense,
  deleteRecurringExpense,
  type RecurringExpense,
} from '@/services/recurring-expenses'
import { createExpense } from '@/services/expenses'
import { formatCurrency } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/types'

export default function RecurrentesPage() {
  const router = useRouter()
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('otros')
  const [saving, setSaving] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    getRecurringExpenses().then(setItems).finally(() => setLoading(false))
  }, [])

  const total = items.reduce((s, i) => s + Number(i.amount), 0)

  const handleAdd = async () => {
    if (!description.trim()) {
      toast.error('Escribe una descripción')
      return
    }
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast.error('Monto inválido')
      return
    }
    setSaving(true)
    try {
      const created = await createRecurringExpense({ description: description.trim(), amount: amt, category })
      setItems((prev) => [...prev, created])
      setDescription('')
      setAmount('')
      toast.success('Gasto fijo agregado')
    } catch {
      toast.error('No se pudo agregar (¿corriste el SQL?)')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurringExpense(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const registerThisMonth = async () => {
    if (items.length === 0) return
    setRegistering(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      for (const it of items) {
        await createExpense({
          description: it.description,
          amount: Number(it.amount),
          category: it.category,
          date: today,
          job_id: null as unknown as undefined,
          notes: 'Gasto fijo',
        })
      }
      toast.success(`${items.length} gasto${items.length !== 1 ? 's' : ''} registrado${items.length !== 1 ? 's' : ''} este mes`)
    } catch {
      toast.error('No se pudieron registrar')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Gastos fijos</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Gastos que se repiten cada mes (renta, seguro, software). Regístralos todos de una vez.
      </p>

      {items.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">{it.category}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold">{formatCurrency(Number(it.amount))}</span>
                  <button onClick={() => handleDelete(it.id)} className="text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Total mensual</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <Button onClick={registerThisMonth} disabled={registering} className="w-full">
              <CalendarCheck className="h-4 w-4 mr-2" />
              {registering ? 'Registrando...' : 'Registrar este mes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            Nuevo gasto fijo
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Input placeholder="Ej: Seguro de camioneta" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Monto</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Agregar gasto fijo'}
          </Button>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground text-center">Cargando...</p>}
    </div>
  )
}
