'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { createExpense } from '@/services/expenses'
import { useJobs } from '@/hooks/use-jobs'

export default function NuevoGastoPage() {
  const router = useRouter()
  const { jobs } = useJobs({ status: 'en_progreso' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true)
      await createExpense({
        ...data,
        job_id: data.job_id || null,
      })
      toast.success('Gasto registrado')
      router.push('/gastos')
    } catch {
      toast.error('Error al registrar el gasto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nuevo gasto</h1>
      </div>

      <ExpenseForm
        jobs={jobs}
        onSubmit={handleSubmit}
        isLoading={loading}
        submitLabel="Registrar gasto"
      />
    </div>
  )
}
