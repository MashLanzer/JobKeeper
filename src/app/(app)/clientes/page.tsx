'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Users, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ClientCard } from '@/components/clients/client-card'
import { useClients } from '@/hooks/use-clients'

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const { clients, loading, error } = useClients(search || undefined)

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Clientes"
        description={`${clients.length} cliente${clients.length !== 1 ? 's' : ''}`}
        action={
          <Button asChild size="sm">
            <Link href="/clientes/nuevo">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Link>
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin clientes"
          description={
            search
              ? 'No se encontraron clientes con esa búsqueda'
              : 'Agrega tu primer cliente para comenzar a organizarte'
          }
          action={
            !search ? (
              <Button asChild>
                <Link href="/clientes/nuevo">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar cliente
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
