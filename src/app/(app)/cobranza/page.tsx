'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, DollarSign, Phone, CheckCircle2, FileText, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getJobs, updateJob } from '@/services/jobs'
import { getPaymentsTotalForJobs, addPayment } from '@/services/payments'
import { getSettings } from '@/services/settings'
import { getPromises, setPromise, clearPromise } from '@/lib/payment-promises'
import { getCobroTemplate, renderTemplate } from '@/lib/message-templates'
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
  const [sort, setSort] = useState<'monto' | 'antiguedad' | 'promesa'>('monto')
  const [collectingId, setCollectingId] = useState<string | null>(null)
  const [promises, setPromises] = useState<Record<string, string>>({})
  const [promiseFor, setPromiseFor] = useState<Debtor | null>(null)
  const [promiseDate, setPromiseDate] = useState('')

  useEffect(() => {
    setPromises(getPromises())
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

  // Fecha local de hoy en 'YYYY-MM-DD' (el input date usa fecha local, no UTC).
  const todayKey = (() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  })()

  const sortedDebtors = [...debtors].sort((a, b) => {
    if (sort === 'antiguedad') return daysSince(b.job) - daysSince(a.job)
    if (sort === 'promesa') {
      const pa = promises[a.job.id]
      const pb = promises[b.job.id]
      if (pa && pb) return pa.localeCompare(pb)
      if (pa) return -1
      if (pb) return 1
      return b.pending - a.pending
    }
    return b.pending - a.pending
  })

  const openPromise = (d: Debtor) => {
    setPromiseFor(d)
    setPromiseDate(promises[d.job.id] || '')
  }

  const savePromise = () => {
    if (!promiseFor) return
    const next = promiseDate
      ? setPromise(promiseFor.job.id, promiseDate)
      : clearPromise(promiseFor.job.id)
    setPromises({ ...next })
    haptic('light')
    toast.success(promiseDate ? 'Promesa de pago guardada' : 'Promesa eliminada')
    setPromiseFor(null)
  }

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
      clearPromise(d.job.id)
      setPromises((prev) => {
        const next = { ...prev }
        delete next[d.job.id]
        return next
      })
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

  // Estado de cuenta del moroso: junta TODAS las deudas de ese cliente en un PDF.
  const generateStatement = async (d: Debtor) => {
    try {
      const rows = debtors.filter((x) =>
        d.job.client_id ? x.job.client_id === d.job.client_id : x.job.id === d.job.id
      )
      const clientName = d.job.client?.name || 'Cliente'
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 14

      doc.setFillColor(99, 102, 241)
      doc.rect(0, 0, pageW, 26, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(businessName || 'WorkLedger', margin, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Estado de cuenta', pageW - margin, 16, { align: 'right' })

      doc.setTextColor(30, 30, 30)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(clientName, margin, 38)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(110, 110, 110)
      doc.text(`Emitido: ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}`, margin, 44)

      const totalPending = rows.reduce((s, r) => s + r.pending, 0)
      autoTable(doc, {
        startY: 50,
        head: [['Trabajo', 'Fecha', 'Pendiente']],
        body: rows.map((r) => [
          r.job.title,
          r.job.scheduled_at ? formatDate(r.job.scheduled_at) : formatDate(r.job.created_at),
          formatCurrency(r.pending),
        ]),
        foot: [['TOTAL', '', formatCurrency(totalPending)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
        footStyles: { fillColor: [238, 238, 248], textColor: [30, 30, 30], fontStyle: 'bold' },
      })

      // @ts-expect-error lastAutoTable lo agrega el plugin
      let y = (doc.lastAutoTable?.finalY || 60) + 10
      if (paymentInfo) {
        doc.setTextColor(30, 30, 30)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('Formas de pago', margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(80, 80, 80)
        doc.text(paymentInfo, margin, y)
      }

      const safeName = clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      doc.save(`estado-cuenta-${safeName}.pdf`)
      toast.success('Estado de cuenta descargado')
    } catch {
      toast.error('Error al generar el estado de cuenta')
    }
  }

  const remindWhatsApp = (d: Debtor) => {
    const phone = (d.job.client?.phone || '').replace(/[^\d+]/g, '')
    const pay = paymentInfo ? `\n\nPuedes pagar por: ${paymentInfo}` : ''
    const msg = renderTemplate(getCobroTemplate(), {
      cliente: d.job.client?.name || '',
      negocio: businessName || '',
      monto: formatCurrency(d.pending),
      trabajo: d.job.title,
      pago: pay,
    })
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
              {(['monto', 'antiguedad', 'promesa'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-md transition-colors capitalize',
                    sort === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'monto' ? 'Monto' : s === 'antiguedad' ? 'Más antiguo' : 'Promesa'}
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
            const promise = promises[d.job.id]
            const promiseOverdue = promise ? promise < todayKey : false
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

                {promise && (
                  <div
                    className={cn(
                      'mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                      promiseOverdue
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {promiseOverdue ? 'Prometió pagar el' : 'Promesa de pago'} {formatDate(promise)}
                  </div>
                )}

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPromise(d)}
                    aria-label="Promesa de pago"
                    className={cn(promise && 'border-primary text-primary')}
                  >
                    <CalendarClock className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => generateStatement(d)} aria-label="Estado de cuenta PDF">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!promiseFor} onOpenChange={(o) => !o && setPromiseFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Promesa de pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {promiseFor?.job.client?.name || 'Cliente'} · saldo{' '}
              {promiseFor ? formatCurrency(promiseFor.pending) : ''}
            </p>
            <Input
              type="date"
              value={promiseDate}
              min={todayKey}
              onChange={(e) => setPromiseDate(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            {promiseFor && promises[promiseFor.job.id] && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  setPromiseDate('')
                  const next = clearPromise(promiseFor.job.id)
                  setPromises({ ...next })
                  haptic('light')
                  toast.success('Promesa eliminada')
                  setPromiseFor(null)
                }}
              >
                Quitar
              </Button>
            )}
            <Button onClick={savePromise} disabled={!promiseDate}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
