'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Briefcase, Users, Receipt, Package, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { getJobs } from '@/services/jobs'
import { getClients } from '@/services/clients'
import { getExpenses } from '@/services/expenses'
import { getMaterials } from '@/services/materials'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import type { Job, Client, Expense, Material } from '@/types'

// Resalta las coincidencias del término dentro de un texto.
function highlight(text: string, term: string) {
  const q = term.trim()
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function BuscarPage() {
  const router = useRouter()
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [recents, setRecents] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState('todo')

  useEffect(() => {
    try {
      setRecents(JSON.parse(localStorage.getItem('recent_searches') || '[]'))
    } catch {
      // ignore
    }
  }, [])

  const rememberSearch = (q: string) => {
    const v = q.trim()
    if (v.length < 2) return
    const next = [v, ...recents.filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 6)
    setRecents(next)
    localStorage.setItem('recent_searches', JSON.stringify(next))
  }

  const clearRecents = () => {
    setRecents([])
    localStorage.removeItem('recent_searches')
  }

  useEffect(() => {
    const q = term.trim()
    if (q.length < 2) {
      setJobs([])
      setClients([])
      setExpenses([])
      setMaterials([])
      return
    }

    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const [j, c, allExp, allMat] = await Promise.all([
          getJobs({ search: q }),
          getClients(q),
          getExpenses(),
          getMaterials(),
        ])
        if (cancelled) return
        const lower = q.toLowerCase()
        setJobs(j)
        setClients(c)
        setExpenses(
          allExp.filter(
            (e) =>
              e.description.toLowerCase().includes(lower) ||
              e.category.toLowerCase().includes(lower)
          )
        )
        setMaterials(allMat.filter((m) => m.name.toLowerCase().includes(lower)))
      } catch {
        // silencioso
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const t = setTimeout(run, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [term])

  const hasQuery = term.trim().length >= 2
  const totalResults = jobs.length + clients.length + expenses.length + materials.length
  const show = (t: string) => typeFilter === 'todo' || typeFilter === t
  const TYPE_CHIPS: { value: string; label: string }[] = [
    { value: 'todo', label: `Todo (${totalResults})` },
    { value: 'trabajos', label: `Trabajos (${jobs.length})` },
    { value: 'clientes', label: `Clientes (${clients.length})` },
    { value: 'gastos', label: `Gastos (${expenses.length})` },
    { value: 'materiales', label: `Materiales (${materials.length})` },
  ]

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Buscar</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Buscar trabajos, clientes, gastos, materiales..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {term && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setTerm('')}
            aria-label="Limpiar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!hasQuery ? (
        recents.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Recientes
              </h2>
              <button onClick={clearRecents} className="text-xs text-muted-foreground hover:text-foreground">
                Limpiar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => setTerm(r)}
                  className="text-sm px-3 py-1.5 rounded-full bg-muted text-foreground hover:bg-muted/70 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Escribe al menos 2 caracteres para buscar
          </p>
        )
      ) : loading ? (
        <ListSkeleton count={4} />
      ) : totalResults === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Sin resultados para &quot;{term}&quot;
        </p>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TYPE_CHIPS.map((c) => (
              <button
                key={c.value}
                onClick={() => setTypeFilter(c.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  typeFilter === c.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {show('trabajos') && jobs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                Trabajos ({jobs.length})
              </h2>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link key={job.id} href={`/trabajos/${job.id}`} className="block" onClick={() => rememberSearch(term)}>
                    <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium truncate">{highlight(job.title, term)}</h3>
                            <JobStatusBadge status={job.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {job.category}
                            {job.client ? ` · ${job.client.name}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-money flex-shrink-0">
                          {formatCurrency(job.price)}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {show('clientes') && clients.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Clientes ({clients.length})
              </h2>
              <div className="space-y-4">
                {clients.map((client) => (
                  <Link key={client.id} href={`/clientes/${client.id}`} className="block" onClick={() => rememberSearch(term)}>
                    <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {getInitials(client.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{highlight(client.name, term)}</p>
                          {(client.phone || client.email) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {client.phone || client.email}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {show('gastos') && expenses.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                Gastos ({expenses.length})
              </h2>
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <Link key={expense.id} href="/gastos" className="block" onClick={() => rememberSearch(term)}>
                    <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{highlight(expense.description, term)}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {expense.category}{expense.date ? ` · ${formatDate(expense.date)}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-destructive flex-shrink-0">
                          -{formatCurrency(expense.amount)}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {show('materiales') && materials.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                Materiales ({materials.length})
              </h2>
              <div className="space-y-4">
                {materials.map((m) => (
                  <Link key={m.id} href="/materiales" className="block" onClick={() => rememberSearch(term)}>
                    <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{highlight(m.name, term)}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {Number(m.stock)}{m.unit ? ` ${m.unit}` : ''}
                          </p>
                        </div>
                        {Number(m.price) > 0 && (
                          <span className="text-sm font-semibold text-money flex-shrink-0">
                            {formatCurrency(Number(m.price))}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
