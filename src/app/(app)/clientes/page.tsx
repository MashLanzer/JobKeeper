'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Users, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ClientCard } from '@/components/clients/client-card'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { useClients } from '@/hooks/use-clients'
import { cn } from '@/lib/utils'
import type { ClientType } from '@/types'

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | ClientType>('todos')
  const { clients, loading, error, refetch } = useClients(search || undefined)

  // Trata los clientes sin tipo como "cliente".
  const filtered = clients.filter((c) => {
    if (filter === 'todos') return true
    return (c.type || 'cliente') === filter
  })

  const tabs: { value: 'todos' | ClientType; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'cliente', label: 'Clientes' },
    { value: 'contratista', label: 'Contratistas' },
  ]

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Clientes"
        description={`${filtered.length} ${filter === 'contratista' ? 'contratista' : 'cliente'}${filtered.length !== 1 ? 's' : ''}`}
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

      {/* Type filter */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              'flex-1 text-sm font-medium py-1.5 rounded-md transition-colors',
              filter === t.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filter === 'contratista' ? 'Sin contratistas' : 'Sin clientes'}
          description={
            search
              ? 'No se encontraron resultados con esa búsqueda'
              : filter === 'todos'
                ? 'Agrega tu primer cliente para comenzar a organizarte'
                : `Aún no tienes ${filter === 'contratista' ? 'contratistas' : 'clientes'} en esta categoría`
          }
          action={
            !search ? (
              <Button asChild>
                <Link href="/clientes/nuevo">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
