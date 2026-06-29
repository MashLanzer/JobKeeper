'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, DollarSign, Phone, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getJobs, updateJob } from '@/services/jobs'
import { getPaymentsTotalForJobs, addPayment } from '@/services/payments'
import { getSettings } from '@/services/settings'
import { haptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Job } from '@/types'

const daysSince = (job: Job): number => {
  const ref = job.scheduled_at || job.completed_at || job.created_at
  if (!ref) return 0
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000)
}

interface Debtor {
  job: Job
  pending: number
}

export default function CobranzaPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [paymentInfo, setPaymentInfo] = useState('')
  const [sort, setSort] = useState<'monto' | 'antiguedad'>('monto')
  const [collectingId, setCollectingId] = useState<string | null>(null)

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

  const sortedDebtors = [...debtors].sort((a, b) =>
    sort === 'antiguedad' ? daysSince(b.job) - daysSince(a.job) : b.pending - a.pending
  )

  // Cobrar desde la lista: registra el saldo pendiente y fija paid_at.
  const handleCollect = async (d: Debtor) => {
    setCollectingId(d.job.id)
    try {
      if (d.pending > 0) {
        await addPayment({ job_id: d.job.id, amount: d.pending, method: d.job.payment_method || 'efectivo' })
      }
      await updateJob(d.job.id, { paid_at: new Date().toISOString() })
      haptic('success')
      toast.success('Trabajo cobrado')
      setDebtors((prev) => prev.filter((x) => x.job.id !== d.job.id))
    } catch {
      toast.error('No se pudo marcar como cobrado')
    } finally {
      setCollectingId(null)
    }
  }

  const callClient = (d: Debtor) => {
    const phone = (d.job.client?.phone || '').replace(/[^\d+]/g, '')
    if (phone) window.open(`tel:${phone}`, '_self')
  }

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
        <>
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {debtors.length} por cobrar
              </p>
            </div>
            <p className="text-lg font-bold text-pending">{formatCurrency(total)}</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Ordenar:</span>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(['monto', 'antiguedad'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-md transition-colors capitalize',
                    sort === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'monto' ? 'Monto' : 'Más antiguo'}
                </button>
              ))}
            </div>
          </div>
        </>
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
          {sortedDebtors.map((d) => {
            const days = daysSince(d.job)
            const collected = Number(d.job.price) - d.pending
            return (
            <Card key={d.job.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/trabajos/${d.job.id}`} className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{d.job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.job.client?.name || 'Sin cliente'}
                      {d.job.scheduled_at ? ` · ${formatDate(d.job.scheduled_at)}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {collected > 0 && <>Cobrado {formatCurrency(collected)} de {formatCurrency(Number(d.job.price))} · </>}
                      <span className={cn(days >= 30 && 'text-pending font-medium')}>
                        {days <= 0 ? 'hoy' : `hace ${days} día${days !== 1 ? 's' : ''}`}
                      </span>
                    </p>
                  </Link>
                  <span className="text-base font-bold text-pending flex-shrink-0">
                    {formatCurrency(d.pending)}
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  <ConfirmDialog
                    title="¿Marcar como cobrado?"
                    description={`Se registrará el saldo de ${formatCurrency(d.pending)} como pagado.`}
                    confirmLabel="Cobrar"
                    variant="default"
                    onConfirm={() => handleCollect(d)}
                    trigger={
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={collectingId === d.job.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Cobrar
                      </Button>
                    }
                  />
                  <Button variant="outline" size="sm" onClick={() => remindWhatsApp(d)} aria-label="Recordar por WhatsApp">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  {d.job.client?.phone && (
                    <Button variant="outline" size="sm" onClick={() => callClient(d)} aria-label="Llamar">
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
