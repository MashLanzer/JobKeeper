'use client'

import { Trash2, Tag, Calendar, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getReceiptUrl } from '@/services/expense-receipts'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Expense } from '@/types'

interface ExpenseCardProps {
  expense: Expense
  onDelete?: (id: string) => void
}

export function ExpenseCard({ expense, onDelete }: ExpenseCardProps) {
  const openReceipt = async () => {
    if (!expense.receipt_path) return
    const url = await getReceiptUrl(expense.receipt_path)
    if (url) window.open(url, '_blank')
    else toast.error('No se pudo abrir el recibo')
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{expense.description}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs capitalize">
                <Tag className="h-3 w-3 mr-1" />
                {expense.category}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(expense.date)}
              </span>
            </div>

            {expense.job && (
              <p className="text-xs text-muted-foreground">
                Trabajo: {expense.job.title}
              </p>
            )}

            {expense.notes && (
              <p className="text-xs text-muted-foreground mt-1">{expense.notes}</p>
            )}

            {expense.receipt_path && (
              <button onClick={openReceipt} className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
                <ImageIcon className="h-3.5 w-3.5" />
                Ver recibo
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-lg font-bold text-destructive">
              -{formatCurrency(expense.amount)}
            </span>
            {onDelete && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Eliminar gasto"
                description={`¿Estás seguro de que quieres eliminar el gasto "${expense.description}"?`}
                confirmLabel="Eliminar"
                onConfirm={() => onDelete(expense.id)}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
