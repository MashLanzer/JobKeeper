'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Client } from '@/types'

interface ClientCardProps {
  client: Client
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Link href={`/clientes/${client.id}`} className="block">
      <Card className="hover:border-primary/50 transition-colors active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                {client.type === 'contratista' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 whitespace-nowrap flex-shrink-0">
                    Contratista
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-0.5">
                {client.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              {(client.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(client.tags || []).map((t) => (
                    <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
