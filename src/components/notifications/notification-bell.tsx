'use client'

import { Bell, Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/use-notifications'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types'

const typeColors: Record<NotificationType, string> = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    !notif.is_read && 'bg-muted/30'
                  )}
                  onClick={() => !notif.is_read && markRead(notif.id)}
                >
                  <div className="mt-1 flex-shrink-0">
                    <span
                      className={cn(
                        'block h-2 w-2 rounded-full',
                        typeColors[notif.type],
                        notif.is_read && 'opacity-30'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', notif.is_read && 'text-muted-foreground')}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(notif.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
