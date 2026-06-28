'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { getJobs } from '@/services/jobs'
import { getPaymentsTotalForJobs } from '@/services/payments'
import { getSettings } from '@/services/settings'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Job } from '@/types'

interface Debtor {
  job: Job
  pending: number
}

export default function CobranzaPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [paymentInfo, setPaymentInfo] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [jobs, settings] = await Promise.all([getJobs(), getSettings()])
        setBusinessName(settings.name)
        setPaymentInfo(settings.payment_info)
        const active = jobs.filter((j) => j.status !== 'cancelado')
        const ids = active.map((j) => j.id)
        const payMap = await getPaymentsTotalForJobs(ids)
        const list: Debtor[] = active
          .map((job) => ({
            job,
            pending: Number(job.price) - Number(job.deposit) - (payMap[job.id] || 0),
          }))
          .filter((d) => d.pending > 0.005)
          .sort((a, b) => b.pending - a.pending)
        setDebtors(list)
      } catch {
        // silencioso
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const total = debtors.reduce((s, d) => s + d.pending, 0)

  const remindWhatsApp = (d: Debtor) => {
    const phone = (d.job.client?.phone || '').replace(/[^\d+]/g, '')
    const name = d.job.client?.name || ''
    const from = businessName ? ` de ${businessName}` : ''
    const pay = paymentInfo ? `\n\nPuedes pagar por: ${paymentInfo}` : ''
    const msg = `Hola ${name}, te escribo${from} para recordarte el saldo pendiente de ${formatCurrency(d.pending)} por "${d.job.title}".${pay}\n\n¡Gracias!`
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6 page-transition">
      <PageHeader title="Cobranza" description="Trabajos con saldo pendiente" />

      {!loading && debtors.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Total por cobrar
            </p>
          </div>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(total)}</p>
        </div>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : debtors.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="¡Todo cobrado!"
          description="No tienes trabajos con saldo pendiente"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {debtors.map((d) => (
            <Card key={d.job.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/trabajos/${d.job.id}`} className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{d.job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.job.client?.name || 'Sin cliente'}
                      {d.job.scheduled_at ? ` · ${formatDate(d.job.scheduled_at)}` : ''}
                    </p>
                  </Link>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
                    {formatCurrency(d.pending)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                  onClick={() => remindWhatsApp(d)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Recordar por WhatsApp
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
