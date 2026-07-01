'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Moon, Sun, User, Mail, Palette, Info, Target, Building2, Download, Lock, Bell, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/providers/theme-provider'
import { getInitials, formatCurrency } from '@/lib/utils'
import { getSettings, upsertSettings, type BusinessSettings } from '@/services/settings'
import { getJobs } from '@/services/jobs'
import { getClients } from '@/services/clients'
import { getExpenses } from '@/services/expenses'
import { getMaterials } from '@/services/materials'
import { getTemplates } from '@/services/templates'
import { getPin, setPin, clearPin } from '@/lib/pin'
import { getCurrency, setCurrency, CURRENCIES } from '@/lib/currency'
import { getAccent, setAccent, ACCENTS } from '@/lib/accent'
import { getPdfPrefs, setPdfPrefs, type PdfPrefs } from '@/lib/pdf-prefs'
import { ensurePermission, syncAllReminders, sendTestReminder } from '@/lib/local-notifications'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  getCobroTemplate,
  setCobroTemplate,
  DEFAULT_COBRO,
  COBRO_VARS,
} from '@/lib/message-templates'

export default function ConfiguracionPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [goalInput, setGoalInput] = useState('')
  const [savedGoal, setSavedGoal] = useState(0)
  const [business, setBusiness] = useState<BusinessSettings>({
    name: '', phone: '', email: '', logo: '', income_goal: 0, review_link: '', payment_info: '',
  })
  const [savingBusiness, setSavingBusiness] = useState(false)
  // Huella de los datos guardados para detectar cambios sin guardar.
  const bizFingerprint = (b: BusinessSettings) =>
    JSON.stringify([b.name, b.phone, b.email, b.logo, b.review_link, b.payment_info])
  const [savedBizPrint, setSavedBizPrint] = useState('')
  const bizDirty = bizFingerprint(business) !== savedBizPrint

  useEffect(() => {
    const load = async () => {
      let settings = await getSettings()

      // Migración única desde localStorage (versiones anteriores).
      const isEmpty =
        !settings.name && !settings.phone && !settings.email && !settings.logo && !settings.income_goal
      if (isEmpty && user?.id) {
        const legacyBiz = localStorage.getItem('business_info')
        const legacyGoal = localStorage.getItem(`income_goal_${user.id}`)
        if (legacyBiz || legacyGoal) {
          const biz = legacyBiz ? JSON.parse(legacyBiz) : {}
          const migrated: BusinessSettings = {
            name: biz.name || '',
            phone: biz.phone || '',
            email: biz.email || '',
            logo: biz.logo || '',
            income_goal: legacyGoal ? Number(legacyGoal) : 0,
            review_link: '',
            payment_info: '',
          }
          try {
            await upsertSettings(migrated)
            settings = migrated
          } catch {
            // si falla, seguimos con lo que haya
          }
        }
      }

      setBusiness(settings)
      setSavedBizPrint(bizFingerprint(settings))
      if (settings.income_goal > 0) {
        setSavedGoal(settings.income_goal)
        setGoalInput(String(settings.income_goal))
      }
    }
    load()
  }, [user?.id])

  const handleSaveBusiness = async () => {
    setSavingBusiness(true)
    try {
      await upsertSettings({
        name: business.name.trim(),
        phone: business.phone.trim(),
        email: business.email.trim(),
        logo: business.logo || '',
        review_link: (business.review_link || '').trim(),
        payment_info: (business.payment_info || '').trim(),
      })
      setSavedBizPrint(bizFingerprint(business))
      toast.success('Datos del negocio guardados')
    } catch {
      toast.error('Error al guardar los datos del negocio')
    } finally {
      setSavingBusiness(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen')
      return
    }
    if (file.size > 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 1 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setBusiness((b) => ({ ...b, logo: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveGoal = async () => {
    const val = Number(goalInput)
    if (isNaN(val) || val < 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    try {
      await upsertSettings({ income_goal: val })
      setSavedGoal(val)
      toast.success(val === 0 ? 'Meta eliminada' : 'Meta guardada')
    } catch {
      toast.error('Error al guardar la meta')
    }
  }

  const [exporting, setExporting] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [hasPin, setHasPin] = useState(false)
  const [currency, setCurrencyState] = useState('USD')
  const [pdfPrefs, setPdfPrefsState] = useState<PdfPrefs>({ photos: true, checklist: true, signature: true })
  const [remindersOn, setRemindersOn] = useState(true)
  const [reminderLead, setReminderLead] = useState('1d')
  const [accent, setAccentState] = useState('indigo')
  const [cobroTpl, setCobroTpl] = useState(DEFAULT_COBRO)
  const [savedCobroTpl, setSavedCobroTpl] = useState(DEFAULT_COBRO)

  useEffect(() => {
    setHasPin(!!getPin())
    setCurrencyState(getCurrency())
    setPdfPrefsState(getPdfPrefs())
    setRemindersOn(localStorage.getItem('reminders_enabled') !== '0')
    setReminderLead(localStorage.getItem('reminder_lead') || '1d')
    setAccentState(getAccent())
    const tpl = getCobroTemplate()
    setCobroTpl(tpl)
    setSavedCobroTpl(tpl)
  }, [])

  const handleSaveCobroTpl = () => {
    setCobroTemplate(cobroTpl)
    setSavedCobroTpl(cobroTpl.trim() || DEFAULT_COBRO)
    toast.success('Plantilla guardada')
  }

  const handleToggleReminders = async (v: boolean) => {
    setRemindersOn(v)
    localStorage.setItem('reminders_enabled', v ? '1' : '0')
    if (v) await ensurePermission()
    await syncAllReminders()
    toast.success(v ? 'Recordatorios activados' : 'Recordatorios desactivados')
  }

  const handleChangeLead = async (v: string) => {
    setReminderLead(v)
    localStorage.setItem('reminder_lead', v)
    await syncAllReminders()
  }

  const handleTestReminder = async () => {
    const res = await sendTestReminder()
    if (res === 'ok') toast.success('Te llegará una notificación en unos segundos')
    else if (res === 'no-permiso') toast.error('Activa el permiso de notificaciones')
    else toast.info('La prueba solo funciona en la app del teléfono')
  }

  const togglePdfPref = (key: keyof PdfPrefs, value: boolean) => {
    const next = { ...pdfPrefs, [key]: value }
    setPdfPrefsState(next)
    setPdfPrefs(next)
  }

  const handleSavePin = () => {
    if (!/^\d{4,8}$/.test(pinInput)) {
      toast.error('El PIN debe ser de 4 a 8 dígitos')
      return
    }
    setPin(pinInput)
    setHasPin(true)
    setPinInput('')
    toast.success('PIN activado')
  }

  const handleRemovePin = () => {
    clearPin()
    setHasPin(false)
    setPinInput('')
    toast.success('PIN desactivado')
  }

  const handleExportBackup = async () => {
    setExporting(true)
    try {
      const [jobs, clients, expenses, materials, templates, settings] = await Promise.all([
        getJobs(),
        getClients(),
        getExpenses(),
        getMaterials(),
        getTemplates(),
        getSettings(),
      ])
      const backup = { exportedAt: new Date().toISOString(), settings, clients, jobs, expenses, materials, templates }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workledger-respaldo-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Respaldo descargado')
    } catch {
      toast.error('Error al generar el respaldo')
    } finally {
      setExporting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const email = user?.email || ''
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0]
  const initials = getInitials(displayName)

  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">Preferencias de tu cuenta</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Business info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Datos del negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Aparecen en los recibos y cotizaciones PDF que envías a tus clientes.
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Logo</Label>
            <div className="flex items-center gap-3">
              {business.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo}
                  alt="Logo"
                  className="h-14 w-14 rounded-lg object-contain border border-border bg-white"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Button asChild variant="outline" size="sm">
                  <label className="cursor-pointer">
                    {business.logo ? 'Cambiar' : 'Subir logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                </Button>
                {business.logo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7"
                    onClick={() => setBusiness((b) => ({ ...b, logo: '' }))}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">PNG o JPG, máximo 1 MB. Recuerda guardar.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizName" className="text-xs">Nombre del negocio</Label>
            <Input
              id="bizName"
              placeholder="Ej: Refrigeración Ibarra"
              value={business.name}
              onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizPhone" className="text-xs">Teléfono</Label>
            <Input
              id="bizPhone"
              placeholder="Ej: (813) 555-0199"
              value={business.phone}
              onChange={(e) => setBusiness((b) => ({ ...b, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizEmail" className="text-xs">Email</Label>
            <Input
              id="bizEmail"
              type="email"
              placeholder="Ej: contacto@negocio.com"
              value={business.email}
              onChange={(e) => setBusiness((b) => ({ ...b, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizReview" className="text-xs">Link de reseñas (Google)</Label>
            <Input
              id="bizReview"
              placeholder="Ej: https://g.page/r/..."
              value={business.review_link || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, review_link: e.target.value }))}
            />
            <p className="text-[10px] text-muted-foreground">Se envía al cliente al completar un trabajo.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizPay" className="text-xs">Datos de pago</Label>
            <Input
              id="bizPay"
              placeholder="Ej: Zelle 813-555-0199 · Venmo @refri-ibarra"
              value={business.payment_info || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, payment_info: e.target.value }))}
            />
            <p className="text-[10px] text-muted-foreground">Se incluye en los recordatorios de cobro.</p>
          </div>
          {bizDirty && (
            <p className="text-xs text-pending text-center">Tienes cambios sin guardar</p>
          )}
          <Button onClick={handleSaveBusiness} size="sm" className="w-full" disabled={savingBusiness || !bizDirty}>
            {savingBusiness ? 'Guardando...' : bizDirty ? 'Guardar datos del negocio' : 'Guardado'}
          </Button>
        </CardContent>
      </Card>

      {/* Income goal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Meta de ingresos mensual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Define un objetivo mensual y verás el progreso en el dashboard. Pon 0 para desactivar.
          </p>
          {savedGoal > 0 && (
            <p className="text-sm font-medium text-primary">
              Meta actual: {formatCurrency(savedGoal)}
            </p>
          )}
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="50"
              placeholder="Ej: 2000"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveGoal} size="sm" className="px-4">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Apariencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'Modo oscuro activo' : 'Modo claro activo'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="gap-2"
            >
              {theme === 'dark' ? (
                <><Sun className="h-4 w-4" /> Claro</>
              ) : (
                <><Moon className="h-4 w-4" /> Oscuro</>
              )}
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Moneda</p>
            <Select
              value={currency}
              onValueChange={(v) => {
                setCurrencyState(v)
                setCurrency(v)
                toast.success('Moneda actualizada')
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <p className="text-sm font-medium">Color de acento</p>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setAccent(a.id); setAccentState(a.id) }}
                  aria-label={a.label}
                  className={`h-9 w-9 rounded-full transition-transform ${accent === a.id ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                  style={{ backgroundColor: `hsl(${a.hsl})` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Recordatorios de trabajos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Avisar antes de cada trabajo</p>
              <p className="text-xs text-muted-foreground">Notificación en el teléfono (app cerrada)</p>
            </div>
            <Switch checked={remindersOn} onCheckedChange={handleToggleReminders} />
          </div>
          {remindersOn && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Cuándo avisar</p>
              <Select value={reminderLead} onValueChange={handleChangeLead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hora antes</SelectItem>
                  <SelectItem value="3h">3 horas antes</SelectItem>
                  <SelectItem value="1d">1 día antes</SelectItem>
                  <SelectItem value="2d">2 días antes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Solo aplica a trabajos con fecha y hora programada.</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={handleTestReminder}>
            <Bell className="h-4 w-4 mr-2" />
            Probar notificación
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp message template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Mensaje de cobro (WhatsApp)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Personaliza el mensaje que se envía desde Cobranza. Usa estas variables:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COBRO_VARS.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => setCobroTpl((t) => `${t}${v.token}`)}
                title={v.desc}
                className="text-[11px] font-mono px-2 py-1 rounded-md bg-muted text-foreground hover:bg-muted/70 transition-colors"
              >
                {v.token}
              </button>
            ))}
          </div>
          <Textarea
            value={cobroTpl}
            onChange={(e) => setCobroTpl(e.target.value)}
            rows={5}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSaveCobroTpl}
              size="sm"
              className="flex-1"
              disabled={cobroTpl.trim() === savedCobroTpl.trim()}
            >
              {cobroTpl.trim() === savedCobroTpl.trim() ? 'Guardado' : 'Guardar plantilla'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setCobroTpl(DEFAULT_COBRO)}
            >
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipt PDF options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Contenido del recibo PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Incluir fotos</span>
            <Switch checked={pdfPrefs.photos} onCheckedChange={(v) => togglePdfPref('photos', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Incluir checklist</span>
            <Switch checked={pdfPrefs.checklist} onCheckedChange={(v) => togglePdfPref('checklist', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Incluir firma</span>
            <Switch checked={pdfPrefs.signature} onCheckedChange={(v) => togglePdfPref('signature', v)} />
          </div>
        </CardContent>
      </Card>

      {/* App lock (PIN) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Bloqueo con PIN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasPin ? (
            <>
              <p className="text-sm text-green-600 dark:text-green-400">PIN activado</p>
              <p className="text-xs text-muted-foreground">Se pide al abrir la app.</p>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  type="password"
                  placeholder="Nuevo PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  maxLength={8}
                  className="flex-1"
                />
                <Button onClick={handleSavePin} size="sm">Cambiar</Button>
                <Button onClick={handleRemovePin} size="sm" variant="ghost" className="text-destructive">Quitar</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Protege la app con un PIN de 4 a 8 dígitos (se pide al abrir).
              </p>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  type="password"
                  placeholder="PIN (4-8 dígitos)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  maxLength={8}
                  className="flex-1"
                />
                <Button onClick={handleSavePin} size="sm">Activar</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aplicación</span>
            <span className="font-medium">WorkLedger</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Versión</span>
            <span className="font-medium">0.2.0</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handleExportBackup}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Generando...' : 'Exportar respaldo (JSON)'}
          </Button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <ConfirmDialog
        title="¿Cerrar sesión?"
        description="Tendrás que iniciar sesión de nuevo para volver a entrar."
        confirmLabel="Cerrar sesión"
        onConfirm={handleSignOut}
        trigger={
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        }
      />
    </div>
  )
}
