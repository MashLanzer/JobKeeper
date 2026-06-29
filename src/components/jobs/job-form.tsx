'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JOB_CATEGORIES, JOB_STATUSES, PAYMENT_METHODS } from '@/types'
import type { Job, Client, Equipment } from '@/types'
import { getEquipmentForClient } from '@/services/equipment'
import { getLastPrice } from '@/lib/job-prefs'
import { Loader2 } from 'lucide-react'

const jobSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  address: z.string().optional(),
  category: z.string().min(1, 'La categoría es requerida'),
  client_id: z.string().optional(),
  equipment_id: z.string().optional(),
  priority: z.enum(['normal', 'urgente']),
  scheduled_at: z.string().optional(),
  price: z.number({ invalid_type_error: 'Precio inválido' }).min(0, 'El precio no puede ser negativo'),
  deposit: z.number({ invalid_type_error: 'Anticipo inválido' }).min(0, 'El anticipo no puede ser negativo'),
  status: z.enum(['pendiente', 'en_progreso', 'completado', 'cancelado']),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

interface JobFormProps {
  initialData?: Partial<Job>
  clients: Client[]
  onSubmit: (data: JobFormData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function JobForm({ initialData, clients, onSubmit, isLoading, submitLabel = 'Guardar' }: JobFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      address: initialData?.address || '',
      category: initialData?.category || 'General/Varios',
      client_id: initialData?.client_id || undefined,
      equipment_id: initialData?.equipment_id || undefined,
      priority: initialData?.priority || 'normal',
      scheduled_at: initialData?.scheduled_at
        ? new Date(initialData.scheduled_at).toISOString().slice(0, 16)
        : '',
      price: initialData?.price || 0,
      deposit: initialData?.deposit || 0,
      status: initialData?.status || 'pendiente',
      payment_method: initialData?.payment_method || '',
      notes: initialData?.notes || '',
    },
  })

  const selectedClient = watch('client_id')
  const [equipment, setEquipment] = useState<Equipment[]>([])

  useEffect(() => {
    if (selectedClient) {
      getEquipmentForClient(selectedClient).then(setEquipment).catch(() => setEquipment([]))
    } else {
      setEquipment([])
    }
  }, [selectedClient])

  const submit = handleSubmit((data) => {
    if (!data.equipment_id) delete data.equipment_id
    // Solo enviamos priority si es "urgente" (evita romper si la columna no existe aún)
    if (data.priority === 'normal') delete (data as Partial<JobFormData>).priority
    return onSubmit(data)
  })

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título <span className="text-destructive">*</span></Label>
        <Input
          id="title"
          placeholder="Ej: Reparación de aire acondicionado"
          className={errors.title ? 'border-destructive focus-visible:ring-destructive/40' : ''}
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoría <span className="text-destructive">*</span></Label>
        <Select
          defaultValue={initialData?.category || 'General/Varios'}
          onValueChange={(v) => {
            setValue('category', v)
            // En trabajos nuevos, prellena el precio con el último usado en esa
            // categoría (si el usuario aún no escribió un precio).
            if (!initialData && !getValues('price')) {
              const last = getLastPrice(v)
              if (last) setValue('price', last)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {JOB_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_id">Cliente</Label>
        <Select
          defaultValue={initialData?.client_id || 'none'}
          onValueChange={(v) => {
            const id = v === 'none' ? undefined : v
            setValue('client_id', id)
            // Autocompleta la dirección del cliente si el campo está vacío.
            if (id && !getValues('address')) {
              const c = clients.find((x) => x.id === id)
              if (c?.address) setValue('address', c.address)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin cliente</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Prioridad</Label>
        <Select
          defaultValue={initialData?.priority || 'normal'}
          onValueChange={(v) => setValue('priority', v as JobFormData['priority'])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {equipment.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="equipment_id">Equipo</Label>
          <Select
            defaultValue={initialData?.equipment_id || 'none'}
            onValueChange={(v) => setValue('equipment_id', v === 'none' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin equipo</SelectItem>
              {equipment.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}{e.brand ? ` · ${e.brand}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Descripción del trabajo..."
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          placeholder="Dirección del trabajo"
          {...register('address')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduled_at">Fecha y hora programada</Label>
        <Input
          id="scheduled_at"
          type="datetime-local"
          {...register('scheduled_at')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="price">Precio (USD) <span className="text-destructive">*</span></Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className={errors.price ? 'border-destructive focus-visible:ring-destructive/40' : ''}
            {...register('price', { valueAsNumber: true })}
          />
          {errors.price && (
            <p className="text-xs text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deposit">Anticipo (USD)</Label>
          <Input
            id="deposit"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('deposit', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            defaultValue={initialData?.status || 'pendiente'}
            onValueChange={(v) => setValue('status', v as JobFormData['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method">Método de pago</Label>
          <Select
            defaultValue={initialData?.payment_method || 'none'}
            onValueChange={(v) => setValue('payment_method', v === 'none' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Método de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin especificar</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
