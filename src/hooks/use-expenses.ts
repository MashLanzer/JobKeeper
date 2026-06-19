'use client'

import { useState, useEffect, useCallback } from 'react'
import { getExpenses, createExpense, deleteExpense } from '@/services/expenses'
import type { Expense } from '@/types'
import type { ExpenseFilters } from '@/services/expenses'

export function useExpenses(filters?: ExpenseFilters) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getExpenses(filters)
      setExpenses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const create = useCallback(async (data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const expense = await createExpense(data)
    setExpenses((prev) => [expense, ...prev])
    return expense
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { expenses, loading, error, refetch: fetchExpenses, create, remove }
}
