'use client'

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
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'

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

export default function MasPage() {
  return (
    <div className="space-y-6 page-transition">
      <h1 className="text-2xl font-bold text-foreground">Más</h1>

      <div className="grid grid-cols-3 gap-3">
        {tools.map(({ href, label, icon: Icon, color, bg }) => (
          <Link key={href} href={href} className="block">
            <Card className="hover:border-primary/50 transition-colors active:scale-[0.97]">
              <div className="flex flex-col items-center justify-center gap-2 py-5 px-1">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
