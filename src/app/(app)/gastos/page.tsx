'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Receipt, Repeat, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ExpenseCard } from '@/components/expenses/expense-card'
import { useExpenses } from '@/hooks/use-expenses'
import { EXPENSE_CATEGORIES } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function GastosPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { expenses, loading, error, remove } = useExpenses(
    categoryFilter !== 'all' ? { category: categoryFilter } : undefined
  )

  const visibleExpenses = search.trim()
    ? expenses.filter((e) => e.description.toLowerCase().includes(search.trim().toLowerCase()))
    : expenses

  const totalAmount = visibleExpenses.reduce((sum, e) => sum + e.amount, 0)

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar gasto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={categoryFilter}
        onValueChange={setCategoryFilter}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {EXPENSE_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      ) : visibleExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin gastos"
          description={search ? 'No se encontraron gastos con esa búsqueda' : 'Registra tus gastos para llevar un control de tus finanzas'}
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
        <div className="flex flex-col gap-4">
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
