'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Briefcase, Calendar, Users, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAttentionSummary } from '@/lib/attention'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/trabajos', label: 'Trabajos', icon: Briefcase },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/mas', label: 'Más', icon: LayoutGrid },
]

// Caché a nivel de módulo para no consultar en cada navegación.
let cachedCount = 0
let lastFetch = 0
const TTL = 60_000 // 1 min

export function BottomNav() {
  const pathname = usePathname()
  const [attention, setAttention] = useState(cachedCount)

  // Refresca el contador al navegar, pero como mucho una vez por minuto.
  useEffect(() => {
    if (Date.now() - lastFetch < TTL) {
      setAttention(cachedCount)
      return
    }
    let active = true
    lastFetch = Date.now()
    getAttentionSummary()
      .then((s) => {
        cachedCount = s.count
        lastFetch = Date.now()
        if (active) setAttention(s.count)
      })
      .catch(() => {})
    return () => { active = false }
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm pb-safe">
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full px-1 rounded-xl transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center w-12 h-8 rounded-xl transition-colors',
                isActive && 'bg-primary/10'
              )}>
                <Icon className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
                {href === '/mas' && attention > 0 && (
                  <span className="absolute top-0.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                    {attention}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
