'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAlerts, type AlertType } from '@/hooks/use-alerts'
import { cn } from '@/lib/utils'

const typeColors: Record<AlertType, string> = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
}

export function NotificationBell() {
  const { alerts } = useAlerts()
  const [open, setOpen] = useState(false)
  const count = alerts.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm">Avisos</h4>
        </div>

        <ScrollArea className="max-h-80">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Todo al día</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <span className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', typeColors[a.type])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
