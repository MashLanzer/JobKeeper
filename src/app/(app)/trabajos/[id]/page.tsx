'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, MapPin, Clock, DollarSign, User, Tag, FileText, CreditCard, Copy, ClipboardList, Share2, CheckCircle2, Play, Navigation, Circle, ListChecks, ImageIcon, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useJob } from '@/hooks/use-jobs'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import { getSettings, type BusinessSettings } from '@/services/settings'
import { sharePdf } from '@/lib/share-pdf'
import { nextFolio } from '@/lib/folio'
import { buildChecklist, type ChecklistItem } from '@/lib/checklist'
import { SignaturePad } from '@/components/jobs/signature-pad'
import { createTemplate } from '@/services/templates'
import { getPayments, addPayment, deletePayment, type Payment } from '@/services/payments'
import { getPhotos, uploadPhoto, deletePhoto, type JobPhoto } from '@/services/photos'
import { getJobMaterials, addJobMaterial, deleteJobMaterial, type JobMaterial } from '@/services/job-materials'
import { getMaterials } from '@/services/materials'
import { getExpenses } from '@/services/expenses'
import type { Material, LineItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAYMENT_METHODS } from '@/types'

// Descarga una imagen remota y la convierte a data URL para incrustarla en el PDF.
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { job, loading, error, remove, update } = useJob(id)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [signature, setSignature] = useState<string | null>(null)
  const [settings, setSettings] = useState<BusinessSettings>({
    name: '', phone: '', email: '', logo: '', income_goal: 0,
  })
  const [payments, setPayments] = useState<Payment[]>([])
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('efectivo')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [savingPayment, setSavingPayment] = useState(false)

  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [jobMaterials, setJobMaterials] = useState<JobMaterial[]>([])
  const [inventory, setInventory] = useState<Material[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [matName, setMatName] = useState('')
  const [matQty, setMatQty] = useState('1')
  const [matPrice, setMatPrice] = useState('')
  const [matLinkedId, setMatLinkedId] = useState<string | null>(null)
  const [savingMat, setSavingMat] = useState(false)

  useEffect(() => {
    if (id) {
      getPayments(id).then(setPayments).catch(() => {})
      getPhotos(id).then(setPhotos).catch(() => {})
      getJobMaterials(id).then(setJobMaterials).catch(() => {})
      getExpenses({ job_id: id })
        .then((exps) => setExpensesTotal(exps.reduce((s, e) => s + Number(e.amount), 0)))
        .catch(() => {})
    }
  }, [id])

  useEffect(() => {
    getMaterials().then(setInventory).catch(() => {})
  }, [])

  const materialsCost = jobMaterials.reduce((s, m) => s + Number(m.quantity) * Number(m.unit_price), 0)
  const jobProfit = (job ? Number(job.price) : 0) - materialsCost - expensesTotal

  const handleAddMaterial = async () => {
    const name = matName.trim()
    const quantity = Number(matQty)
    const unit_price = Number(matPrice)
    if (!name) {
      toast.error('Indica el material')
      return
    }
    if (!quantity || quantity <= 0) {
      toast.error('Cantidad inválida')
      return
    }
    setSavingMat(true)
    try {
      const created = await addJobMaterial({ job_id: id, material_id: matLinkedId, name, quantity, unit_price })
      setJobMaterials((prev) => [...prev, created])
      setMatName('')
      setMatQty('1')
      setMatPrice('')
      setMatLinkedId(null)
      toast.success('Material agregado')
    } catch {
      toast.error('No se pudo agregar el material')
    } finally {
      setSavingMat(false)
    }
  }

  const handleDeleteMaterial = async (mId: string) => {
    try {
      await deleteJobMaterial(mId)
      setJobMaterials((prev) => prev.filter((m) => m.id !== mId))
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const pickInventory = (materialId: string) => {
    if (materialId === 'none') {
      setMatLinkedId(null)
      return
    }
    const m = inventory.find((it) => it.id === materialId)
    if (m) {
      setMatLinkedId(m.id)
      setMatName(m.name)
      setMatPrice(String(Number(m.price)))
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5 MB')
      return
    }
    setUploadingPhoto(true)
    try {
      await uploadPhoto(id, file)
      setPhotos(await getPhotos(id))
      toast.success('Foto agregada')
    } catch {
      toast.error('No se pudo subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (photo: JobPhoto) => {
    try {
      await deletePhoto(photo)
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    } catch {
      toast.error('No se pudo eliminar la foto')
    }
  }

  const paymentsTotal = payments.reduce((s, p) => s + Number(p.amount), 0)
  const collected = (job ? Number(job.deposit) : 0) + paymentsTotal
  const pendingAmount = (job ? Number(job.price) : 0) - collected

  const handleAddPayment = async () => {
    const amount = Number(payAmount)
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    setSavingPayment(true)
    try {
      const created = await addPayment({ job_id: id, amount, method: payMethod, paid_at: payDate })
      setPayments((prev) => [created, ...prev])
      setPayAmount('')
      setShowPayForm(false)
      if (job && collected + amount >= Number(job.price)) {
        await update({ paid_at: new Date().toISOString() })
      }
      toast.success('Pago registrado')
    } catch {
      toast.error('No se pudo registrar el pago')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId)
      setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    } catch {
      toast.error('No se pudo eliminar el pago')
    }
  }

  const [warrantyUntil, setWarrantyUntil] = useState('')
  const [followupAt, setFollowupAt] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [discount, setDiscount] = useState('0')
  const [taxRate, setTaxRate] = useState('0')

  // Sincroniza checklist, firma, garantía, seguimiento y desglose al cargar/cambiar.
  useEffect(() => {
    if (job) {
      setChecklist(buildChecklist(job.checklist))
      setSignature(job.signature ?? null)
      setWarrantyUntil(job.warranty_until ?? '')
      setFollowupAt(job.followup_at ?? '')
      setLineItems(job.line_items ?? [])
      setDiscount(String(job.discount ?? 0))
      setTaxRate(String(job.tax_rate ?? 0))
    }
  }, [job])

  const itemsSubtotal = lineItems.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0)
  const discountNum = Number(discount) || 0
  const taxNum = Number(taxRate) || 0
  const itemsTaxable = Math.max(0, itemsSubtotal - discountNum)
  const itemsTax = itemsTaxable * (taxNum / 100)
  const itemsTotal = itemsTaxable + itemsTax

  const persistBreakdown = async (items: LineItem[], disc: number, tax: number) => {
    try {
      await update({ line_items: items, discount: disc, tax_rate: tax })
    } catch {
      toast.error('No se pudo guardar el desglose')
    }
  }

  const addLineItem = () => {
    const next = [...lineItems, { description: '', quantity: 1, unit_price: 0 }]
    setLineItems(next)
  }

  const updateLineItem = (i: number, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  const removeLineItem = (i: number) => {
    const next = lineItems.filter((_, idx) => idx !== i)
    setLineItems(next)
    persistBreakdown(next, discountNum, taxNum)
  }

  const applyTotalToPrice = async () => {
    try {
      await update({ price: itemsTotal, line_items: lineItems, discount: discountNum, tax_rate: taxNum })
      toast.success('Total aplicado al precio del trabajo')
    } catch {
      toast.error('No se pudo aplicar el total')
    }
  }

  const saveWarranty = async (v: string) => {
    setWarrantyUntil(v)
    try {
      await update({ warranty_until: v || null })
    } catch {
      toast.error('No se pudo guardar la garantía')
    }
  }

  const saveFollowup = async (v: string) => {
    setFollowupAt(v)
    try {
      await update({ followup_at: v || null, followup_done: false })
    } catch {
      toast.error('No se pudo guardar el seguimiento')
    }
  }

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {})
  }, [])

  const toggleChecklistItem = async (index: number) => {
    const next = checklist.map((it, i) => (i === index ? { ...it, done: !it.done } : it))
    setChecklist(next) // optimista
    try {
      await update({ checklist: next })
    } catch {
      toast.error('No se pudo guardar el checklist')
    }
  }

  const handleGeneratePDF = async () => {
    if (!job) return
    setGeneratingPdf(true)
    try {
      const business = settings
      const businessName = business.name.trim() || 'WorkLedger'
      const contact = [business.phone, business.email].filter(Boolean).join('   ·   ')

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const pageW = doc.internal.pageSize.getWidth()
      const margin = 20
      let y = margin

      // Header
      doc.setFillColor(79, 70, 229)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      const folio = nextFolio('recibo')
      let nameX = margin
      if (business.logo) {
        try {
          const fmt = business.logo.substring(business.logo.indexOf('/') + 1, business.logo.indexOf(';')).toUpperCase()
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(margin, 5, 18, 18, 2, 2, 'F')
          doc.addImage(business.logo, fmt, margin + 1, 6, 16, 16)
          nameX = margin + 22
        } catch {
          // logo inválido: se omite
        }
      }
      doc.text(businessName, nameX, 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`RECIBO #${folio}`, pageW - margin, 15, { align: 'right' })
      if (contact) {
        doc.setFontSize(8)
        doc.text(contact, nameX, 22)
      }

      y = 40

      // Job title
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(job.title, margin, y)
      y += 6

      if (job.category) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(job.category, margin, y)
        y += 5
      }

      y += 4
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      const row = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(label.toUpperCase(), margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        doc.setFontSize(10)
        doc.text(value, margin, y + 4.5)
        y += 12
      }

      // Client section
      if (job.client) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(79, 70, 229)
        doc.text('CLIENTE', margin, y)
        y += 6
        row('Nombre', job.client.name)
        if ((job.client as any).phone) row('Teléfono', (job.client as any).phone)
        if ((job.client as any).email) row('Email', (job.client as any).email)

        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, pageW - margin, y)
        y += 6
      }

      // Job details
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('DETALLES DEL TRABAJO', margin, y)
      y += 6

      if (job.address) row('Dirección', job.address)
      if (job.scheduled_at) row('Fecha programada', formatDateTime(job.scheduled_at))
      if (job.completed_at) row('Fecha completado', formatDateTime(job.completed_at))
      if (job.description) {
        const lines = doc.splitTextToSize(job.description, pageW - margin * 2)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('DESCRIPCIÓN', margin, y)
        y += 4.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(lines, margin, y)
        y += lines.length * 5 + 7
      }

      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      // Financial summary
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('RESUMEN FINANCIERO', margin, y)
      y += 8

      const finRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(10)
        doc.setTextColor(bold ? 30 : 80, bold ? 30 : 80, bold ? 30 : 80)
        doc.text(label, margin, y)
        if (color) doc.setTextColor(...color)
        doc.text(value, pageW - margin, y, { align: 'right' })
        y += 7
      }

      finRow('Precio total', formatCurrency(job.price), true, [22, 163, 74])
      if (job.deposit > 0) {
        finRow('Anticipo recibido', formatCurrency(job.deposit))
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y - 2, pageW - margin, y - 2)
        const pending = job.price - job.deposit
        finRow('Pendiente por cobrar', formatCurrency(pending), true, pending > 0 ? [202, 138, 4] : [22, 163, 74])
      }

      // Tareas realizadas (checklist)
      const doneTasks = checklist.filter((i) => i.done)
      if (doneTasks.length > 0) {
        y += 4
        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, pageW - margin, y)
        y += 6
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(79, 70, 229)
        doc.text('TAREAS REALIZADAS', margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doneTasks.forEach((t) => {
          doc.text(`•  ${t.label}`, margin, y)
          y += 6
        })
      }

      // Firma del cliente
      if (signature) {
        try {
          y += 6
          doc.addImage(signature, 'PNG', margin, y, 50, 22)
          y += 24
          doc.setDrawColor(150, 150, 150)
          doc.line(margin, y, margin + 50, y)
          y += 4
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(120, 120, 120)
          doc.text('Firma del cliente', margin, y)
        } catch {
          // firma inválida: se omite
        }
      }

      // Footer
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      const genDate = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
      doc.text(`Generado el ${genDate}`, margin, pageH - 10)
      doc.text(businessName, pageW - margin, pageH - 10, { align: 'right' })

      // Fotos del trabajo (en página aparte para no desordenar el recibo)
      const photoList = photos.filter((p) => p.url).slice(0, 4)
      if (photoList.length) {
        doc.addPage()
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(79, 70, 229)
        doc.text('Fotos del trabajo', margin, 22)
        let py = 30
        let px = margin
        for (const ph of photoList) {
          const dataUrl = await urlToDataUrl(ph.url as string)
          if (!dataUrl) continue
          const fmt = dataUrl.substring(dataUrl.indexOf('/') + 1, dataUrl.indexOf(';')).toUpperCase()
          try {
            doc.addImage(dataUrl, fmt, px, py, 85, 64)
          } catch {
            continue
          }
          if (px === margin) {
            px = margin + 90
          } else {
            px = margin
            py += 70
          }
        }
      }

      const safeTitle = job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const result = await sharePdf(doc, `recibo-${safeTitle}.pdf`, `Recibo - ${job.title}`)
      toast.success(result === 'shared' ? 'Recibo listo para enviar' : 'Recibo descargado')
    } catch {
      toast.error('Error al generar el recibo')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!job) return
    const name = window.prompt('Nombre de la plantilla', job.title)
    if (!name || !name.trim()) return
    try {
      await createTemplate(name.trim(), {
        title: job.title,
        description: job.description || '',
        address: job.address || '',
        category: job.category,
        price: job.price,
        payment_method: job.payment_method || '',
        notes: job.notes || '',
      })
      toast.success('Plantilla guardada')
    } catch {
      toast.error('No se pudo guardar la plantilla')
    }
  }

  const handleDuplicate = () => {
    if (!job) return
    const data = {
      title: `${job.title} (copia)`,
      description: job.description || '',
      address: job.address || '',
      category: job.category,
      client_id: job.client_id || undefined,
      price: job.price,
      deposit: 0,
      status: 'pendiente',
      payment_method: job.payment_method || '',
      notes: job.notes || '',
    }
    sessionStorage.setItem('duplicate_job', JSON.stringify(data))
    router.push('/trabajos/nuevo')
  }

  const handleGenerateQuote = async () => {
    if (!job) return
    setGeneratingQuote(true)
    try {
      const business = settings
      const businessName = business.name.trim() || 'WorkLedger'
      const contact = [business.phone, business.email].filter(Boolean).join('   ·   ')

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 20
      let y = margin

      // Header
      doc.setFillColor(79, 70, 229)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      const folio = nextFolio('cotizacion')
      let nameX = margin
      if (business.logo) {
        try {
          const fmt = business.logo.substring(business.logo.indexOf('/') + 1, business.logo.indexOf(';')).toUpperCase()
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(margin, 5, 18, 18, 2, 2, 'F')
          doc.addImage(business.logo, fmt, margin + 1, 6, 16, 16)
          nameX = margin + 22
        } catch {
          // logo inválido: se omite
        }
      }
      doc.text(businessName, nameX, 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`COTIZACIÓN #${folio}`, pageW - margin, 15, { align: 'right' })
      if (contact) {
        doc.setFontSize(8)
        doc.text(contact, nameX, 22)
      }

      y = 40
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(job.title, margin, y)
      y += 6

      if (job.category) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(job.category, margin, y)
        y += 5
      }

      const dateStr = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(`Fecha: ${dateStr}`, margin, y + 2)
      y += 10

      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      const row = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(label.toUpperCase(), margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(value, margin, y + 4.5)
        y += 12
      }

      if (job.client) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(79, 70, 229)
        doc.text('CLIENTE', margin, y)
        y += 6
        row('Nombre', job.client.name)
        if ((job.client as any).phone) row('Teléfono', (job.client as any).phone)
        if ((job.client as any).email) row('Email', (job.client as any).email)
        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, pageW - margin, y)
        y += 6
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.text('DESCRIPCIÓN DEL SERVICIO', margin, y)
      y += 6

      if (job.address) row('Lugar del servicio', job.address)
      if (job.scheduled_at) row('Fecha estimada', formatDateTime(job.scheduled_at))
      if (job.description) {
        const lines = doc.splitTextToSize(job.description, pageW - margin * 2)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('DESCRIPCIÓN', margin, y)
        y += 4.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(lines, margin, y)
        y += lines.length * 5 + 7
      }

      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      if (lineItems.length > 0) {
        // Cotización detallada por líneas
        const { default: autoTable } = await import('jspdf-autotable')
        autoTable(doc, {
          startY: y,
          head: [['Descripción', 'Cant.', 'P. unit.', 'Importe']],
          body: lineItems.map((it) => [
            it.description || '—',
            String(Number(it.quantity)),
            formatCurrency(Number(it.unit_price)),
            formatCurrency(Number(it.quantity) * Number(it.unit_price)),
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [99, 102, 241] },
          margin: { left: margin, right: margin },
        })
        // @ts-expect-error lastAutoTable lo agrega el plugin
        y = (doc.lastAutoTable?.finalY || y) + 6

        const totRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal')
          doc.setFontSize(bold ? 12 : 10)
          doc.setTextColor(...(color || [80, 80, 80]))
          doc.text(label, pageW - margin - 50, y)
          doc.text(value, pageW - margin, y, { align: 'right' })
          y += bold ? 8 : 6
        }
        totRow('Subtotal', formatCurrency(itemsSubtotal))
        if (discountNum > 0) totRow('Descuento', `-${formatCurrency(discountNum)}`)
        if (taxNum > 0) totRow(`Impuesto (${taxNum}%)`, formatCurrency(itemsTax))
        totRow('TOTAL', formatCurrency(itemsTotal), true, [22, 163, 74])
        y += 4
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(79, 70, 229)
        doc.text('PRECIO', margin, y)
        y += 8

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(22, 163, 74)
        doc.text(formatCurrency(job.price), pageW - margin, y, { align: 'right' })
        y += 10
      }

      // Validity note
      doc.setFillColor(245, 245, 255)
      doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(79, 70, 229)
      doc.text('Esta cotización es válida por 30 días a partir de la fecha de emisión.', pageW / 2, y + 8.5, { align: 'center' })

      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generado el ${dateStr}`, margin, pageH - 10)
      doc.text(businessName, pageW - margin, pageH - 10, { align: 'right' })

      const safeTitle = job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const result = await sharePdf(doc, `cotizacion-${safeTitle}.pdf`, `Cotización - ${job.title}`)
      toast.success(result === 'shared' ? 'Cotización lista para enviar' : 'Cotización descargada')
    } catch {
      toast.error('Error al generar la cotización')
    } finally {
      setGeneratingQuote(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!job || pendingAmount <= 0) return
    setUpdatingStatus(true)
    try {
      const created = await addPayment({
        job_id: id,
        amount: pendingAmount,
        method: job.payment_method || 'efectivo',
      })
      setPayments((prev) => [created, ...prev])
      await update({ paid_at: new Date().toISOString() })
      toast.success('Trabajo marcado como cobrado')
    } catch {
      toast.error('Error al actualizar el cobro')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleChangeStatus = async (status: 'en_progreso' | 'completado') => {
    if (!job) return
    setUpdatingStatus(true)
    try {
      const patch: Record<string, unknown> = { status }
      if (status === 'completado' && !job.completed_at) {
        patch.completed_at = new Date().toISOString()
      }
      await update(patch)
      toast.success(status === 'completado' ? 'Trabajo completado' : 'Trabajo iniciado')
    } catch {
      toast.error('Error al cambiar el estado')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    try {
      await remove()
      toast.success('Trabajo eliminado')
      router.push('/trabajos')
    } catch {
      toast.error('Error al eliminar el trabajo')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 page-transition">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error || 'Trabajo no encontrado'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold leading-tight">{job.title}</h1>
            <p className="text-xs text-muted-foreground">{job.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/trabajos/${id}/editar`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Eliminar trabajo"
            description={`¿Estás seguro de que quieres eliminar "${job.title}"? Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <JobStatusBadge status={job.status} />
        {job.payment_method && (
          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            {job.payment_method}
          </span>
        )}
      </div>

      {/* Quick status actions */}
      {job.status !== 'completado' && job.status !== 'cancelado' && (
        <div className="flex gap-2">
          {job.status === 'pendiente' && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleChangeStatus('en_progreso')}
              disabled={updatingStatus}
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() => handleChangeStatus('completado')}
            disabled={updatingStatus}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completar
          </Button>
        </div>
      )}

      {/* Main info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {job.client && (
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <Link href={`/clientes/${job.client_id}`} className="text-sm font-medium text-primary">
                  {job.client.name}
                </Link>
              </div>
            </div>
          )}

          {job.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="text-sm">{job.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-1"
                >
                  <Navigation className="h-3 w-3" />
                  Abrir en mapa
                </a>
              </div>
            </div>
          )}

          {job.scheduled_at && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha programada</p>
                <p className="text-sm">{formatDateTime(job.scheduled_at)}</p>
              </div>
            </div>
          )}

          {job.completed_at && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Completado el</p>
                <p className="text-sm">{formatDateTime(job.completed_at)}</p>
              </div>
            </div>
          )}

          {job.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="text-sm whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>
          )}

          {job.notes && (
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Historial
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Creado', date: job.created_at, done: true },
              { label: 'Programado', date: job.scheduled_at, done: !!job.scheduled_at },
              {
                label: 'Completado',
                date: job.completed_at,
                done: job.status === 'completado',
              },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  />
                  {i < arr.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="-mt-0.5 pb-1">
                  <p className={`text-sm font-medium ${step.done ? '' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.date ? formatDateTime(step.date) : 'Pendiente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warranty & follow-up */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Garantía y seguimiento
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Garantía hasta</Label>
                {warrantyUntil && new Date(warrantyUntil) >= new Date(new Date().toDateString()) && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    En garantía
                  </span>
                )}
              </div>
              <Input type="date" value={warrantyUntil} onChange={(e) => saveWarranty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seguimiento</Label>
              <Input type="date" value={followupAt} onChange={(e) => saveFollowup(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service checklist */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Checklist de servicio
            </h3>
            <span className="text-xs text-muted-foreground">
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          </div>
          <div className="space-y-1">
            {checklist.map((item, i) => (
              <button
                key={item.label}
                onClick={() => toggleChecklistItem(i)}
                className="flex items-center gap-3 w-full text-left py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client signature */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Edit className="h-4 w-4 text-primary" />
            Firma del cliente
          </h3>
          <SignaturePad
            initial={signature}
            onSave={async (dataUrl) => {
              setSignature(dataUrl)
              try {
                await update({ signature: dataUrl })
                toast.success('Firma guardada')
              } catch {
                toast.error('No se pudo guardar la firma')
              }
            }}
            onClear={async () => {
              setSignature(null)
              try {
                await update({ signature: null })
              } catch {
                // ignore
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Fotos ({photos.length})
            </h3>
            <Button asChild variant="outline" size="sm" disabled={uploadingPhoto}>
              <label className="cursor-pointer">
                <Plus className="h-4 w-4 mr-1.5" />
                {uploadingPhoto ? 'Subiendo...' : 'Agregar'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            </Button>
          </div>
          {photos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin fotos. Agrega imágenes del antes/después.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Foto del trabajo"
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    aria-label="Eliminar foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote breakdown (line items) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Desglose de cotización
            </h3>
            <Button variant="ghost" size="sm" className="h-8" onClick={addLineItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Línea
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Agrega líneas (mano de obra, materiales…) para una cotización detallada. Opcional.
            </p>
          ) : (
            <div className="space-y-2">
              {lineItems.map((it, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border border-border p-2">
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Descripción"
                      value={it.description}
                      onChange={(e) => updateLineItem(i, { description: e.target.value })}
                      onBlur={() => persistBreakdown(lineItems, discountNum, taxNum)}
                      className="flex-1"
                    />
                    <button
                      onClick={() => removeLineItem(i)}
                      className="text-muted-foreground hover:text-destructive px-1"
                      aria-label="Eliminar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Cantidad"
                      value={it.quantity}
                      onChange={(e) => updateLineItem(i, { quantity: Number(e.target.value) })}
                      onBlur={() => persistBreakdown(lineItems, discountNum, taxNum)}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio unit."
                      value={it.unit_price}
                      onChange={(e) => updateLineItem(i, { unit_price: Number(e.target.value) })}
                      onBlur={() => persistBreakdown(lineItems, discountNum, taxNum)}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Descuento ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    onBlur={() => persistBreakdown(lineItems, Number(discount) || 0, taxNum)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Impuesto (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    onBlur={() => persistBreakdown(lineItems, discountNum, Number(taxRate) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(itemsSubtotal)}</span>
                </div>
                {discountNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento</span><span>-{formatCurrency(discountNum)}</span>
                  </div>
                )}
                {taxNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Impuesto ({taxNum}%)</span><span>{formatCurrency(itemsTax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span><span className="text-green-600 dark:text-green-400">{formatCurrency(itemsTotal)}</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={applyTotalToPrice}>
                Aplicar total al precio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials used */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Materiales usados
            </h3>
            {materialsCost > 0 && (
              <span className="text-xs text-muted-foreground">{formatCurrency(materialsCost)}</span>
            )}
          </div>

          {jobMaterials.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {jobMaterials.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">
                    {Number(m.quantity)} × {m.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(Number(m.quantity) * Number(m.unit_price))}</span>
                    <button
                      onClick={() => handleDeleteMaterial(m.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar material"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3">
            {inventory.length > 0 && (
              <Select value={matLinkedId || 'none'} onValueChange={pickInventory}>
                <SelectTrigger>
                  <SelectValue placeholder="Del inventario (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Escribir manualmente</SelectItem>
                  {inventory.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Material" value={matName} onChange={(e) => setMatName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min="0" step="0.01" placeholder="Cantidad" value={matQty} onChange={(e) => setMatQty(e.target.value)} />
              <Input type="number" min="0" step="0.01" placeholder="Precio unit." value={matPrice} onChange={(e) => setMatPrice(e.target.value)} />
            </div>
            <Button onClick={handleAddMaterial} size="sm" className="w-full" disabled={savingMat}>
              <Plus className="h-4 w-4 mr-1" />
              {savingMat ? 'Agregando...' : 'Agregar material'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Resumen financiero
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Precio total</span>
              <span className="font-semibold text-green-500">{formatCurrency(job.price)}</span>
            </div>
            {job.deposit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Anticipo inicial</span>
                <span className="font-medium">{formatCurrency(job.deposit)}</span>
              </div>
            )}

            {/* Pagos registrados */}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-sm group">
                <span className="text-muted-foreground">
                  Pago · {formatDate(p.paid_at)}
                  {p.method ? <span className="capitalize"> · {p.method}</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar pago"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}

            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total cobrado</span>
              <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(collected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pendiente por cobrar</span>
              <span className={`font-semibold ${pendingAmount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                {formatCurrency(pendingAmount)}
              </span>
            </div>

            {(materialsCost > 0 || expensesTotal > 0) && (
              <>
                <Separator />
                {materialsCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materiales</span>
                    <span className="font-medium text-destructive">-{formatCurrency(materialsCost)}</span>
                  </div>
                )}
                {expensesTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gastos del trabajo</span>
                    <span className="font-medium text-destructive">-{formatCurrency(expensesTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Ganancia neta</span>
                  <span className={`font-bold ${jobProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                    {formatCurrency(jobProfit)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Add payment form */}
          {showPayForm ? (
            <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monto"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleAddPayment} size="sm" className="flex-1" disabled={savingPayment}>
                  {savingPayment ? 'Guardando...' : 'Registrar pago'}
                </Button>
                <Button onClick={() => setShowPayForm(false)} size="sm" variant="ghost">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            pendingAmount > 0 && (
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleMarkPaid}
                  disabled={updatingStatus}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Cobrar todo ({formatCurrency(pendingAmount)})
                </Button>
                <Button variant="outline" onClick={() => { setPayAmount(String(pendingAmount)); setShowPayForm(true) }}>
                  Pago parcial
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="col-span-2">
          <Link href={`/trabajos/${id}/editar`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar trabajo
          </Link>
        </Button>
        <Button variant="outline" onClick={handleGeneratePDF} disabled={generatingPdf}>
          <Share2 className="h-4 w-4 mr-2" />
          {generatingPdf ? 'Generando...' : 'Recibo'}
        </Button>
        <Button variant="outline" onClick={handleGenerateQuote} disabled={generatingQuote}>
          <ClipboardList className="h-4 w-4 mr-2" />
          {generatingQuote ? 'Generando...' : 'Cotización'}
        </Button>
        <Button variant="outline" onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </Button>
        <Button variant="outline" onClick={handleSaveTemplate}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Plantilla
        </Button>
      </div>
    </div>
  )
}
