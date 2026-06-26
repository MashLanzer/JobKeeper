'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Calendar, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/trabajos', label: 'Trabajos', icon: Briefcase },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/finanzas', label: 'Finanzas', icon: DollarSign },
]

export function BottomNav() {
  const pathname = usePathname()

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
                'flex items-center justify-center w-12 h-8 rounded-xl transition-colors',
                isActive && 'bg-primary/10'
              )}>
                <Icon className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
              </div>
              <span className="text-xs font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
