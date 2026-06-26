'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Moon, Sun, User, Mail, Palette, Info, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/providers/theme-provider'
import { getInitials, formatCurrency } from '@/lib/utils'

export default function ConfiguracionPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [goalInput, setGoalInput] = useState('')
  const [savedGoal, setSavedGoal] = useState(0)

  const goalKey = `income_goal_${user?.id || 'default'}`

  useEffect(() => {
    const val = localStorage.getItem(goalKey)
    if (val) {
      setSavedGoal(Number(val))
      setGoalInput(val)
    }
  }, [goalKey])

  const handleSaveGoal = () => {
    const val = Number(goalInput)
    if (isNaN(val) || val < 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    if (val === 0) {
      localStorage.removeItem(goalKey)
      setSavedGoal(0)
    } else {
      localStorage.setItem(goalKey, String(val))
      setSavedGoal(val)
    }
    toast.success(val === 0 ? 'Meta eliminada' : 'Meta guardada')
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
            <span className="font-medium">1.0.0</span>
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  )
}
