'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Receipt, Repeat, Search, ChevronLeft, ChevronRight, Wallet, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ExpenseCard } from '@/components/expenses/expense-card'
import { useExpenses } from '@/hooks/use-expenses'
import { getExpenses } from '@/services/expenses'
import { getBudgets, setBudget } from '@/lib/budgets'
import { EXPENSE_CATEGORIES } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function GastosPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'fecha' | 'monto'>('fecha')

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  const { expenses, loading, error, remove, refetch } = useExpenses({
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
    from,
    to,
  })

  const atCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (atCurrentMonth) return
    if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1)
  }

  const term = search.trim().toLowerCase()
  const visibleExpenses = (
    term
      ? expenses.filter(
          (e) =>
            e.description.toLowerCase().includes(term) ||
            e.category.toLowerCase().includes(term) ||
            (e.notes || '').toLowerCase().includes(term)
        )
      : expenses
  )
    .slice()
    .sort((a, b) =>
      sort === 'monto'
        ? Number(b.amount) - Number(a.amount)
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    )

  const totalAmount = visibleExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Presupuestos por categoría: gasto del mes (todas las categorías) vs límite.
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [spentByCat, setSpentByCat] = useState<Record<string, number>>({})
  const [budgetOpen, setBudgetOpen] = useState(false)

  useEffect(() => { setBudgets(getBudgets()) }, [])
  useEffect(() => {
    getExpenses({ from, to })
      .then((all) => {
        const map: Record<string, number> = {}
        for (const e of all) map[e.category] = (map[e.category] || 0) + Number(e.amount)
        setSpentByCat(map)
      })
      .catch(() => setSpentByCat({}))
  }, [from, to, loading])

  const overBudget = Object.keys(budgets).filter((c) => budgets[c] > 0 && (spentByCat[c] || 0) > budgets[c])

  const handleSetBudget = (cat: string, value: string) => {
    const amt = Number(value) || 0
    setBudget(cat, amt)
    setBudgets((prev) => {
      const next = { ...prev }
      if (amt > 0) next[cat] = amt
      else delete next[cat]
      return next
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast.success('Gasto eliminado')
    } catch {
      toast.error('Error al eliminar el gasto')
    }
  }

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Gastos"
        description={loading ? '' : `${formatCurrency(totalAmount)} total`}
        action={
          <div className="flex gap-1">
            <Button asChild size="sm" variant="outline">
              <Link href="/gastos/recurrentes">
                <Repeat className="h-4 w-4 mr-1" />
                Fijos
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/gastos/nuevo">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Link>
            </Button>
          </div>
        }
      />

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} disabled={atCurrentMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Presupuestos por categoría */}
      <div className="flex items-center justify-between">
        {overBudget.length > 0 ? (
          <span className="text-xs text-pending flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            {overBudget.length} categoría{overBudget.length !== 1 ? 's' : ''} sobre presupuesto
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Controla tus gastos por categoría</span>
        )}
        <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Wallet className="h-4 w-4 mr-1.5" />
              Presupuestos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Presupuestos de {MONTH_NAMES[month - 1]}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {EXPENSE_CATEGORIES.map((c) => {
                const spent = spentByCat[c] || 0
                const budget = budgets[c] || 0
                const over = budget > 0 && spent > budget
                return (
                  <div key={c} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs capitalize">{c}</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Sin límite"
                        defaultValue={budget || ''}
                        onBlur={(e) => handleSetBudget(c, e.target.value)}
                        className="h-8 w-24 text-right"
                      />
                    </div>
                    {budget > 0 && (
                      <>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', over ? 'bg-destructive' : 'bg-primary')}
                            style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }}
                          />
                        </div>
                        <p className={cn('text-[10px]', over ? 'text-pending font-medium' : 'text-muted-foreground')}>
                          {formatCurrency(spent)} de {formatCurrency(budget)}{over ? ' · excedido' : ''}
                        </p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar gasto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as 'fecha' | 'monto')}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fecha">Recientes</SelectItem>
            <SelectItem value="monto">Mayor monto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : visibleExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin gastos"
          description={search ? 'No se encontraron gastos con esa búsqueda' : `Sin gastos en ${MONTH_NAMES[month - 1]}. Registra tus gastos para llevar el control.`}
          action={
            !search ? (
              <Button asChild>
                <Link href="/gastos/nuevo">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar gasto
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4 stagger-in">
          {visibleExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
