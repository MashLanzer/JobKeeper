'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EXPENSE_CATEGORIES } from '@/types'
import type { Job } from '@/types'

const expenseSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  amount: z.number({ invalid_type_error: 'Monto inválido' }).positive('El monto debe ser positivo'),
  category: z.string().min(1, 'La categoría es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
  job_id: z.string().optional(),
  notes: z.string().optional(),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

interface ExpenseFormProps {
  jobs?: Job[]
  onSubmit: (data: ExpenseFormData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function ExpenseForm({ jobs = [], onSubmit, isLoading, submitLabel = 'Guardar' }: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: undefined,
      category: 'otros',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Descripción <span className="text-destructive">*</span></Label>
        <Input
          id="description"
          placeholder="Ej: Materiales para plomería"
          className={errors.description ? 'border-destructive focus-visible:ring-destructive/40' : ''}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto (USD) <span className="text-destructive">*</span></Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className={errors.amount ? 'border-destructive focus-visible:ring-destructive/40' : ''}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Fecha <span className="text-destructive">*</span></Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoría *</Label>
        <Select
          defaultValue="otros"
          onValueChange={(v) => setValue('category', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {jobs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="job_id">Trabajo relacionado</Label>
          <Select
            defaultValue="none"
            onValueChange={(v) => setValue('job_id', v === 'none' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin trabajo asociado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin trabajo asociado</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Notas adicionales..."
          rows={2}
          {...register('notes')}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {submitLabel}
      </Button>
    </form>
  )
}
