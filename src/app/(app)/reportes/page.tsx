'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { getJobsByMonth } from '@/services/jobs'
import { getExpensesByMonth } from '@/services/expenses'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function ReportesPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)

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
      setLoading(true)
      const jobs = await getJobsByMonth(year, month)

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.text('WorkLedger - Reporte de Trabajos', 14, 20)

      doc.setFontSize(12)
      doc.text(`Período: ${MONTH_NAMES[month - 1]} ${year}`, 14, 30)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 37)

      const totalIncome = jobs
        .filter(j => j.status === 'completado')
        .reduce((s, j) => s + Number(j.price), 0)

      doc.text(`Total trabajos: ${jobs.length}`, 14, 47)
      doc.text(`Ingresos del mes: ${formatCurrency(totalIncome)}`, 14, 54)

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
      setLoading(false)
    }
  }

  const exportExpensesPDF = async () => {
    try {
      setLoading(true)
      const expenses = await getExpensesByMonth(year, month)

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.text('WorkLedger - Reporte de Gastos', 14, 20)

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
      setLoading(false)
    }
  }

  const exportJobsCSV = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  const exportExpensesCSV = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
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
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

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
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={exportJobsCSV}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
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
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={exportExpensesCSV}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
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
