'use client'

export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ClientForm } from '@/components/clients/client-form'
import { useCreateClient } from '@/hooks/use-clients'

export default function NuevoClientePage() {
  const router = useRouter()
  const { create, loading } = useCreateClient()

  const handleSubmit = async (data: any) => {
    try {
      const client = await create(data)
      toast.success('Cliente creado exitosamente')
      router.replace(`/clientes/${client.id}`)
    } catch {
      toast.error('Error al crear el cliente')
    }
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nuevo cliente</h1>
      </div>

      <ClientForm
        onSubmit={handleSubmit}
        isLoading={loading}
        submitLabel="Crear cliente"
      />
    </div>
  )
}
