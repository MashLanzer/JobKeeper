'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JOB_CATEGORIES, JOB_STATUSES } from '@/types'
import type { JobFilters } from '@/services/jobs'

interface JobFiltersProps {
  filters: JobFilters
  onChange: (filters: JobFilters) => void
}

export function JobFiltersBar({ filters, onChange }: JobFiltersProps) {
  const hasFilters = filters.status || filters.category || filters.search || filters.paid !== undefined
  const paidValue = filters.paid === undefined ? 'all' : filters.paid ? 'paid' : 'unpaid'

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar trabajos..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => onChange({ ...filters, search: undefined })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => onChange({ ...filters, status: v === 'all' ? undefined : v as JobFilters['status'] })}
        >
          <SelectTrigger className="h-9 min-w-[130px] text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category || 'all'}
          onValueChange={(v) => onChange({ ...filters, category: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="h-9 min-w-[160px] text-xs">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {JOB_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paidValue}
          onValueChange={(v) =>
            onChange({ ...filters, paid: v === 'all' ? undefined : v === 'paid' })
          }
        >
          <SelectTrigger className="h-9 min-w-[120px] text-xs">
            <SelectValue placeholder="Cobro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Cobrados</SelectItem>
            <SelectItem value="unpaid">Sin cobrar</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs whitespace-nowrap"
            onClick={() => onChange({})}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
