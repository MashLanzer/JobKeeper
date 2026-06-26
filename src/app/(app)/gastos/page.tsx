'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
  const { expenses, loading, error, remove } = useExpenses(
    categoryFilter !== 'all' ? { category: categoryFilter } : undefined
  )

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

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
          <Button asChild size="sm">
            <Link href="/gastos/nuevo">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Link>
          </Button>
        }
      />

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
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin gastos"
          description="Registra tus gastos para llevar un control de tus finanzas"
          action={
            <Button asChild>
              <Link href="/gastos/nuevo">
                <Plus className="h-4 w-4 mr-2" />
                Registrar gasto
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
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
