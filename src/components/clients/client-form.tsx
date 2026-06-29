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
import { CLIENT_TYPES } from '@/types'
import type { Client } from '@/types'

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['cliente', 'contratista']),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  initialData?: Partial<Client>
  onSubmit: (data: ClientFormData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function ClientForm({ initialData, onSubmit, isLoading, submitLabel = 'Guardar' }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'cliente',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      notes: initialData?.notes || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          placeholder="Nombre completo"
          className={errors.name ? 'border-destructive focus-visible:ring-destructive/40' : ''}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Select
          defaultValue={initialData?.type || 'cliente'}
          onValueChange={(v) => setValue('type', v as ClientFormData['type'])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          &quot;Cliente&quot;: tú le haces el trabajo. &quot;Contratista&quot;: te contrata para hacerlo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...register('phone')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="correo@ejemplo.com"
          className={errors.email ? 'border-destructive focus-visible:ring-destructive/40' : ''}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          placeholder="Dirección completa"
          {...register('address')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Notas sobre el cliente..."
          rows={3}
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
