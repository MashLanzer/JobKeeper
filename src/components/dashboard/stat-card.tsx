import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CountUp } from '@/components/dashboard/count-up'

interface StatCardProps {
  title: string
  value: string
  /** Si se pasa, el número se anima desde 0 usando `format`. */
  valueNumber?: number
  format?: (n: number) => string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  iconColor?: string
  iconBg?: string
}

export function StatCard({
  title,
  value,
  valueNumber,
  format,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('rounded-lg p-2', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-xl font-bold text-foreground tracking-tight">
            {valueNumber !== undefined && format ? (
              <CountUp value={valueNumber} format={format} />
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
