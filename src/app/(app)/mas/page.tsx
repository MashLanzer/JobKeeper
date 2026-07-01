'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  Wallet,
  FileText,
  Repeat,
  Package,
  Calculator,
  Settings,
  Search,
  Pencil,
  Check,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ChevronRight,
  Wrench,
  PhoneCall,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAttentionSummary } from '@/lib/attention'
import { formatCurrency } from '@/lib/utils'

interface Tool {
  href: string
  label: string
  icon: LucideIcon
  color: string
  bg: string
}

const tools: Tool[] = [
  { href: '/finanzas', label: 'Finanzas', icon: DollarSign, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  { href: '/cobranza', label: 'Cobranza', icon: Wallet, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { href: '/reportes', label: 'Reportes', icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { href: '/gastos/recurrentes', label: 'Gastos fijos', icon: Repeat, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
  { href: '/materiales', label: 'Materiales', icon: Package, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
  { href: '/buscar', label: 'Buscar', icon: Search, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10' },
  { href: '/configuracion', label: 'Configuración', icon: Settings, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10' },
]

const DEFAULT_ORDER = tools.map((t) => t.href)
const toolByHref: Record<string, Tool> = Object.fromEntries(tools.map((t) => [t.href, t]))

export default function MasPage() {
  const [pending, setPending] = useState(0)
  const [lowCount, setLowCount] = useState(0)
  const [maintDue, setMaintDue] = useState(0)
  const [followupCount, setFollowupCount] = useState(0)
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    getAttentionSummary()
      .then((s) => {
        setPending(s.pending)
        setLowCount(s.lowCount)
        setMaintDue(s.maintDue)
        setFollowupCount(s.followupCount)
      })
      .catch(() => {})
    // Orden/visibilidad guardados localmente.
    try {
      const saved = JSON.parse(localStorage.getItem('mas_order') || 'null')
      if (Array.isArray(saved)) setOrder(saved.filter((h: string) => toolByHref[h]))
    } catch {
      // ignore
    }
  }, [])

  const persist = (next: string[]) => {
    setOrder(next)
    try { localStorage.setItem('mas_order', JSON.stringify(next)) } catch { /* ignore */ }
  }
  const hidden = tools.filter((t) => !order.includes(t.href))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }
  const hide = (href: string) => persist(order.filter((h) => h !== href))
  const showTool = (href: string) => persist([...order, href])

  // Aviso accionable por acceso (solo donde hay algo que atender).
  const badgeFor = (href: string): string | null => {
    if (href === '/cobranza' && pending > 0) return formatCurrency(pending)
    if (href === '/materiales' && lowCount > 0) return `${lowCount} bajo${lowCount !== 1 ? 's' : ''}`
    return null
  }

  // Resumen "necesita atención": lo accionable de un vistazo.
  const alerts = [
    pending > 0 && {
      href: '/cobranza',
      icon: Wallet,
      label: 'Por cobrar',
      value: formatCurrency(pending),
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    maintDue > 0 && {
      href: '/dashboard',
      icon: Wrench,
      label: `Mantenimiento${maintDue !== 1 ? 's' : ''} vencido${maintDue !== 1 ? 's' : ''}`,
      value: String(maintDue),
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10',
    },
    followupCount > 0 && {
      href: '/dashboard',
      icon: PhoneCall,
      label: `Seguimiento${followupCount !== 1 ? 's' : ''} pendiente${followupCount !== 1 ? 's' : ''}`,
      value: String(followupCount),
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    lowCount > 0 && {
      href: '/materiales',
      icon: Package,
      label: `Material${lowCount !== 1 ? 'es' : ''} bajo${lowCount !== 1 ? 's' : ''}`,
      value: String(lowCount),
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10',
    },
  ].filter(Boolean) as { href: string; icon: LucideIcon; label: string; value: string; color: string; bg: string }[]

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Más</h1>
        <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
          {editing ? <><Check className="h-4 w-4 mr-1.5" /> Listo</> : <><Pencil className="h-4 w-4 mr-1.5" /> Editar</>}
        </Button>
      </div>

      {!editing && alerts.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Necesita atención</p>
          <div className="flex flex-col">
            {alerts.map((a, i) => {
              const Icon = a.icon
              return (
                <Link
                  key={`${a.href}-${i}`}
                  href={a.href}
                  className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/50 transition-colors active:scale-[0.99]"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${a.bg}`}>
                    <Icon className={`h-4 w-4 ${a.color}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium">{a.label}</span>
                  <span className={`text-sm font-bold ${a.color}`}>{a.value}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {editing ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            {order.map((href, i) => {
              const t = toolByHref[href]
              if (!t) return null
              return (
                <div key={href} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.bg}`}>
                    <t.icon className={`h-4 w-4 ${t.color}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium">{t.label}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => hide(href)} aria-label="Ocultar">
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          {hidden.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Ocultos</p>
              {hidden.map((t) => (
                <div key={t.href} className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2 opacity-70">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.bg}`}>
                    <t.icon className={`h-4 w-4 ${t.color}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium">{t.label}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => showTool(t.href)} aria-label="Mostrar">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {order.map((href) => {
            const t = toolByHref[href]
            if (!t) return null
            const Icon = t.icon
            const badge = badgeFor(href)
            return (
              <Link key={href} href={href} className="block">
                <Card className="relative hover:border-primary/50 transition-colors active:scale-[0.97]">
                  {badge && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold leading-none px-1.5 py-1 rounded-full bg-amber-500 text-white max-w-[80%] truncate">
                      {badge}
                    </span>
                  )}
                  <div className="flex flex-col items-center justify-center gap-2 py-5 px-1">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${t.bg}`}>
                      <Icon className={`h-6 w-6 ${t.color}`} />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{t.label}</span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
