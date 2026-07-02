'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Receipt, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { getJobsByMonth } from '@/services/jobs'
import { getExpensesByMonth, getFinanceSummary } from '@/services/expenses'
import { getYearReport, getBusinessStats, type BusinessStats, type MonthBreakdown } from '@/services/reports'
import { getSettings, businessNameOf } from '@/services/settings'
import { categoryStyle } from '@/lib/categories'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function ReportesPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  // Acción en curso (para mostrar spinner en el botón correcto). null = nada.
  const [busy, setBusy] = useState<string | null>(null)
  const loading = busy !== null
  const [businessName, setBusinessName] = useState('WorkLedger')
  const [stats, setStats] = useState<BusinessStats | null>(null)
  const [monthSummary, setMonthSummary] = useState<{ totalIncome: number; totalExpenses: number; netProfit: number } | null>(null)
  const [catIncome, setCatIncome] = useState<{ category: string; total: number; count: number }[]>([])
  const [expenseByJob, setExpenseByJob] = useState<{ title: string; total: number }[]>([])
  const [unassignedExpense, setUnassignedExpense] = useState(0)
  const [yearMonths, setYearMonths] = useState<MonthBreakdown[]>([])
  const [taxRate, setTaxRate] = useState('0')

  const atCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  useEffect(() => {
    getSettings().then((s) => setBusinessName(businessNameOf(s))).catch(() => {})
    getBusinessStats().then(setStats).catch(() => {})
    try { setTaxRate(localStorage.getItem('tax_rate_pref') || '0') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    getYearReport(year).then((r) => setYearMonths(r.months)).catch(() => setYearMonths([]))
  }, [year])

  useEffect(() => {
    getFinanceSummary(year, month).then(setMonthSummary).catch(() => setMonthSummary(null))
    // Ingresos por categoría del mes (solo trabajos cobrados).
    getJobsByMonth(year, month)
      .then((jobs) => {
        const map = new Map<string, { total: number; count: number }>()
        for (const j of jobs) {
          if (!j.paid_at) continue
          const cat = j.category || 'General/Varios'
          const cur = map.get(cat) || { total: 0, count: 0 }
          cur.total += Number(j.price)
          cur.count += 1
          map.set(cat, cur)
        }
        setCatIncome(
          Array.from(map.entries())
            .map(([category, v]) => ({ category, ...v }))
            .sort((a, b) => b.total - a.total)
        )
      })
      .catch(() => setCatIncome([]))
    // Gastos agrupados por trabajo asignado.
    getExpensesByMonth(year, month)
      .then((exps) => {
        const map = new Map<string, number>()
        let unassigned = 0
        for (const e of exps) {
          const title = (e.job as { title?: string } | undefined)?.title
          if (title) map.set(title, (map.get(title) || 0) + Number(e.amount))
          else unassigned += Number(e.amount)
        }
        setExpenseByJob(
          Array.from(map.entries())
            .map(([title, total]) => ({ title, total }))
            .sort((a, b) => b.total - a.total)
        )
        setUnassignedExpense(unassigned)
      })
      .catch(() => {
        setExpenseByJob([])
        setUnassignedExpense(0)
      })
  }, [year, month])

  const handleTaxRate = (v: string) => {
    setTaxRate(v)
    try { localStorage.setItem('tax_rate_pref', v) } catch { /* ignore */ }
  }

  const net = monthSummary?.netProfit || 0
  const taxEstimate = net > 0 ? net * ((Number(taxRate) || 0) / 100) : 0

  // Comparativa por trimestre del año seleccionado.
  const quarters = [0, 1, 2, 3].map((q) => {
    const ms = yearMonths.filter((m) => Math.floor((m.month - 1) / 3) === q)
    return {
      q: q + 1,
      income: ms.reduce((s, m) => s + m.income, 0),
      expenses: ms.reduce((s, m) => s + m.expenses, 0),
      net: ms.reduce((s, m) => s + m.net, 0),
    }
  })
  const maxQuarterIncome = Math.max(...quarters.map((x) => x.income), 1)
  const yearHasData = quarters.some((x) => x.income > 0 || x.expenses > 0)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const exportJobsPDF = async () => {
    try {
      setBusy('jobsPdf')
      const jobs = await getJobsByMonth(year, month)

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.text(`${businessName} — Reporte de Trabajos`, 14, 20)

      doc.setFontSize(12)
      doc.text(`Período: ${MONTH_NAMES[month - 1]} ${year}`, 14, 30)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 37)

      // Ingresos = trabajos cobrados (paid_at), no sólo completados.
      const totalIncome = jobs
        .filter(j => j.paid_at)
        .reduce((s, j) => s + Number(j.price), 0)

      doc.text(`Total trabajos: ${jobs.length}`, 14, 47)
      doc.text(`Ingresos cobrados del mes: ${formatCurrency(totalIncome)}`, 14, 54)

      autoTable(doc, {
        startY: 65,
        head: [['Título', 'Cliente', 'Estado', 'Precio', 'Fecha']],
        body: jobs.map(j => [
          j.title,
          (j.client as any)?.name || 'Sin cliente',
          j.status === 'en_progreso' ? 'En Progreso' :
            j.status === 'pendiente' ? 'Pendiente' :
            j.status === 'completado' ? 'Completado' : 'Cancelado',
          formatCurrency(j.price),
          j.scheduled_at ? formatDate(j.scheduled_at) : '—',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      })

      doc.save(`workledger-trabajos-${year}-${String(month).padStart(2, '0')}.pdf`)
      toast.success('PDF descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF')
    } finally {
      setBusy(null)
    }
  }

  const exportExpensesPDF = async () => {
    try {
      setBusy('expPdf')
      const expenses = await getExpensesByMonth(year, month)

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.text(`${businessName} — Reporte de Gastos`, 14, 20)

      doc.setFontSize(12)
      doc.text(`Período: ${MONTH_NAMES[month - 1]} ${year}`, 14, 30)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 37)

      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
      doc.text(`Total gastos: ${expenses.length}`, 14, 47)
      doc.text(`Monto total: ${formatCurrency(totalExpenses)}`, 14, 54)

      autoTable(doc, {
        startY: 65,
        head: [['Descripción', 'Categoría', 'Monto', 'Fecha']],
        body: expenses.map(e => [
          e.description,
          e.category,
          formatCurrency(e.amount),
          formatDate(e.date),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      })

      doc.save(`workledger-gastos-${year}-${String(month).padStart(2, '0')}.pdf`)
      toast.success('PDF descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF')
    } finally {
      setBusy(null)
    }
  }

  const exportJobsCSV = async () => {
    try {
      setBusy('jobsCsv')
      const jobs = await getJobsByMonth(year, month)

      const headers = ['ID', 'Título', 'Cliente', 'Categoría', 'Estado', 'Precio', 'Anticipo', 'Fecha Programada', 'Fecha Completado', 'Método de Pago', 'Notas']
      const rows = jobs.map(j => [
        j.id,
        j.title,
        (j.client as any)?.name || '',
        j.category,
        j.status,
        j.price,
        j.deposit,
        j.scheduled_at || '',
        j.completed_at || '',
        j.payment_method || '',
        (j.notes || '').replace(/,/g, ';'),
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workledger-trabajos-${year}-${String(month).padStart(2, '0')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV descargado')
    } catch {
      toast.error('Error al exportar CSV')
    } finally {
      setBusy(null)
    }
  }

  const exportExpensesCSV = async () => {
    try {
      setBusy('expCsv')
      const expenses = await getExpensesByMonth(year, month)

      const headers = ['ID', 'Descripción', 'Categoría', 'Monto', 'Fecha', 'Trabajo', 'Notas']
      const rows = expenses.map(e => [
        e.id,
        e.description,
        e.category,
        e.amount,
        e.date,
        (e.job as any)?.title || '',
        (e.notes || '').replace(/,/g, ';'),
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workledger-gastos-${year}-${String(month).padStart(2, '0')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV descargado')
    } catch {
      toast.error('Error al exportar CSV')
    } finally {
      setBusy(null)
    }
  }

  const exportMonthlySummaryPDF = async () => {
    try {
      setBusy('summary')
      const [summary, jobs] = await Promise.all([
        getFinanceSummary(year, month),
        getJobsByMonth(year, month),
      ])

      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 14

      // Header band
      doc.setFillColor(99, 102, 241)
      doc.rect(0, 0, pageW, 26, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(businessName, margin, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Resumen mensual', pageW - margin, 16, { align: 'right' })

      let y = 40
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(`${MONTH_NAMES[month - 1]} ${year}`, margin, y)
      y += 12

      const completed = jobs.filter((j) => j.status === 'completado').length
      const pending = jobs.filter((j) => j.status === 'pendiente' || j.status === 'en_progreso').length

      const line = (label: string, value: string, color?: [number, number, number]) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(80, 80, 80)
        doc.text(label, margin, y)
        doc.setFont('helvetica', 'bold')
        if (color) doc.setTextColor(...color)
        else doc.setTextColor(30, 30, 30)
        doc.text(value, pageW - margin, y, { align: 'right' })
        y += 9
      }

      doc.setDrawColor(220, 220, 220)
      line('Ingresos del mes', formatCurrency(summary.totalIncome), [22, 163, 74])
      line('Gastos del mes', `-${formatCurrency(summary.totalExpenses)}`, [220, 38, 38])
      doc.line(margin, y - 3, pageW - margin, y - 3)
      line(
        'Ganancia neta',
        formatCurrency(summary.netProfit),
        summary.netProfit >= 0 ? [22, 163, 74] : [220, 38, 38]
      )
      y += 4
      doc.line(margin, y - 3, pageW - margin, y - 3)
      line('Trabajos totales', String(jobs.length))
      line('Completados', String(completed))
      line('Pendientes / en progreso', String(pending))

      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}`,
        margin,
        doc.internal.pageSize.getHeight() - 12
      )

      doc.save(`resumen-${year}-${String(month).padStart(2, '0')}.pdf`)
      toast.success('Resumen descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el resumen')
    } finally {
      setBusy(null)
    }
  }

  const exportYearReportPDF = async () => {
    try {
      setBusy('year')
      const report = await getYearReport(year)

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
      doc.text(businessName, margin, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Reporte anual ${year}`, pageW - margin, 16, { align: 'right' })

      // Totales
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      let y = 38
      doc.setFont('helvetica', 'bold')
      doc.text(
        `Ingresos: ${formatCurrency(report.totalIncome)}   ·   Gastos: ${formatCurrency(report.totalExpenses)}   ·   Neto: ${formatCurrency(report.netProfit)}`,
        margin,
        y
      )
      y += 4

      // Tabla mes a mes
      autoTable(doc, {
        startY: y + 4,
        head: [['Mes', 'Ingresos', 'Gastos', 'Neto']],
        body: report.months.map((m) => [
          MONTH_NAMES[m.month - 1],
          formatCurrency(m.income),
          formatCurrency(m.expenses),
          formatCurrency(m.net),
        ]),
        foot: [[
          'TOTAL',
          formatCurrency(report.totalIncome),
          formatCurrency(report.totalExpenses),
          formatCurrency(report.netProfit),
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
        footStyles: { fillColor: [238, 238, 248], textColor: [30, 30, 30], fontStyle: 'bold' },
      })

      // Ingresos por categoría
      const categories = Object.entries(report.incomeByCategory).sort(([, a], [, b]) => b - a)
      if (categories.length > 0) {
        // @ts-expect-error lastAutoTable lo agrega el plugin
        const afterY = (doc.lastAutoTable?.finalY || y) + 10
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Ingresos por categoría', margin, afterY)
        autoTable(doc, {
          startY: afterY + 4,
          head: [['Categoría', 'Ingresos', '%']],
          body: categories.map(([cat, amount]) => [
            cat,
            formatCurrency(amount),
            report.totalIncome > 0 ? `${Math.round((amount / report.totalIncome) * 100)}%` : '0%',
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [99, 102, 241] },
        })
      }

      doc.save(`reporte-anual-${year}.pdf`)
      toast.success('Reporte anual descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el reporte anual')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Reportes"
        description="Exporta tus datos a PDF o CSV"
      />

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3">
        <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={nextMonth} disabled={atCurrentMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Resumen del mes (visible) + estimado de impuestos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen de {MONTH_NAMES[month - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ingresos (cobrado)</span>
            <span className="font-semibold text-money">{formatCurrency(monthSummary?.totalIncome || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gastos</span>
            <span className="font-medium text-destructive">-{formatCurrency(monthSummary?.totalExpenses || 0)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ganancia neta</span>
            <span className={`font-bold ${net >= 0 ? 'text-money' : 'text-destructive'}`}>{formatCurrency(net)}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Label className="text-xs whitespace-nowrap">Impuesto estimado (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => handleTaxRate(e.target.value)}
              className="h-8 w-20 text-right"
            />
          </div>
          {Number(taxRate) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuesto estimado</span>
              <span className="font-semibold text-pending">{formatCurrency(taxEstimate)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingresos por categoría del mes */}
      {catIncome.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ingresos por categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const max = catIncome[0]?.total || 1
              const total = catIncome.reduce((s, c) => s + c.total, 0)
              return catIncome.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', categoryStyle(c.category).dot)} />
                      <span className="truncate">{c.category}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        · {c.count} trabajo{c.count !== 1 ? 's' : ''}
                      </span>
                    </span>
                    <span className="font-semibold text-money flex-shrink-0">{formatCurrency(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', categoryStyle(c.category).dot)}
                      style={{ width: `${Math.max(4, (c.total / max) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {total > 0 ? Math.round((c.total / total) * 100) : 0}% del mes
                  </p>
                </div>
              ))
            })()}
          </CardContent>
        </Card>
      )}

      {/* Comparativa trimestral */}
      {yearHasData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comparativa trimestral {year}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quarters.map((q) => (
              <div key={q.q} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">T{q.q}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-money">{formatCurrency(q.income)}</span>
                    <span className={`font-semibold ${q.net >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(q.net)} neto
                    </span>
                  </span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full bg-green-500/60"
                    style={{ width: `${(q.income / maxQuarterIncome) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">
              Barras = ingresos por trimestre (relativo al trimestre más alto).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gastos por trabajo */}
      {(expenseByJob.length > 0 || unassignedExpense > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gastos por trabajo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {expenseByJob.map((e) => (
              <div key={e.title} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{e.title}</span>
                <span className="font-medium text-destructive flex-shrink-0">-{formatCurrency(e.total)}</span>
              </div>
            ))}
            {unassignedExpense > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground italic">Sin trabajo asignado</span>
                <span className="font-medium text-muted-foreground flex-shrink-0">-{formatCurrency(unassignedExpense)}</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground pt-1">
              Asigna un trabajo al registrar un gasto para ver aquí cuánto costó cada uno.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Advanced stats */}
      {stats && stats.completedCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Estadísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Ticket promedio</p>
              <p className="text-lg font-bold">{formatCurrency(stats.avgTicket)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Días para cobrar</p>
              <p className="text-lg font-bold">
                {stats.avgDaysToCollect !== null ? `${Math.round(stats.avgDaysToCollect)} días` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Categoría más frecuente</p>
              <p className="text-sm font-semibold truncate">{stats.topCategory || '—'}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Cliente más rentable</p>
              <p className="text-sm font-semibold truncate">{stats.topClient?.name || '—'}</p>
              {stats.topClient && (
                <p className="text-xs text-money">{formatCurrency(stats.topClient.total)}</p>
              )}
            </div>
            {stats.quoteConversion !== null && (
              <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                <p className="text-xs text-muted-foreground">Conversión de cotizaciones</p>
                <p className="text-lg font-bold">{Math.round(stats.quoteConversion)}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-500" />
            Resumen mensual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Un PDF con ingresos, gastos, ganancia neta y conteo de trabajos de {MONTH_NAMES[month - 1]} {year}. Ideal para tu control o tu contador.
          </p>
          <Button onClick={exportMonthlySummaryPDF} disabled={loading} className="w-full">
            {busy === 'summary' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {busy === 'summary' ? 'Generando…' : 'Generar resumen PDF'}
          </Button>
        </CardContent>
      </Card>

      {/* Annual report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            Reporte anual {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Análisis del año completo: ingresos y gastos mes a mes, totales y rentabilidad por categoría.
          </p>
          <Button onClick={exportYearReportPDF} disabled={loading} variant="outline" className="w-full">
            {busy === 'year' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {busy === 'year' ? 'Generando…' : 'Generar reporte anual PDF'}
          </Button>
        </CardContent>
      </Card>

      {/* Jobs reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Reporte de trabajos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Exporta todos los trabajos de {MONTH_NAMES[month - 1]} {year} con sus detalles, precios y estados.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={exportJobsPDF}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              {busy === 'jobsPdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              PDF
            </Button>
            <Button
              onClick={exportJobsCSV}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              {busy === 'jobsCsv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-destructive" />
            Reporte de gastos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Exporta todos los gastos de {MONTH_NAMES[month - 1]} {year} con sus categorías y montos.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={exportExpensesPDF}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              {busy === 'expPdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              PDF
            </Button>
            <Button
              onClick={exportExpensesCSV}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              {busy === 'expCsv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Los reportes incluyen datos del período seleccionado
      </p>
    </div>
  )
}
