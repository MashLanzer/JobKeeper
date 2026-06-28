'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'

// Pantallas principales donde tiene sentido el acceso rápido a "Nuevo trabajo".
const SHOW_ON = ['/dashboard', '/trabajos', '/clientes', '/calendario', '/mas', '/finanzas']

export function Fab() {
  const pathname = usePathname()
  const show = SHOW_ON.includes(pathname)
  if (!show) return null

  return (
    <Link
      href="/trabajos/nuevo"
      aria-label="Nuevo trabajo"
      className="fixed right-4 bottom-24 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus className="h-7 w-7" />
    </Link>
  )
}
