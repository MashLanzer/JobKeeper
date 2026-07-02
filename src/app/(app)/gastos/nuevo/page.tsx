'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { createExpense, updateExpense } from '@/services/expenses'
import { uploadReceipt } from '@/services/expense-receipts'
import { useJobs } from '@/hooks/use-jobs'

export default function NuevoGastoPage() {
  const router = useRouter()
  const { jobs } = useJobs({ status: 'en_progreso' })
  const [loading, setLoading] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  const onPickReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecciona una imagen'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen debe pesar menos de 5 MB'); return }
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true)
      const expense = await createExpense({
        ...data,
        job_id: data.job_id || null,
      })
      if (receiptFile) {
        const path = await uploadReceipt(expense.id, receiptFile)
        if (path) await updateExpense(expense.id, { receipt_path: path })
      }
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
        <Button variant="ghost" size="icon" aria-label="Volver" onClick={() => router.back()}>
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

      {/* Foto del recibo (opcional) */}
      <div className="space-y-2">
        <Label className="text-xs">Foto del recibo (opcional)</Label>
        {receiptPreview ? (
          <div className="relative w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptPreview} alt="Recibo" className="w-32 h-32 object-cover rounded-lg border border-border" />
            <button
              onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
              aria-label="Quitar foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer">
              <Camera className="h-4 w-4 mr-2" />
              Adjuntar foto
              <input type="file" accept="image/*" className="hidden" onChange={onPickReceipt} />
            </label>
          </Button>
        )}
      </div>
    </div>
  )
}
