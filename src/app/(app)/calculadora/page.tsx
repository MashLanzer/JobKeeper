'use client'

import { useState } from 'react'
import { Calculator, AirVent, ArrowRightLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'

const BTU_PER_FT2 = 25 // estimación para clima cálido (residencial)

export default function CalculadoraPage() {
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState<'ft2' | 'm2'>('ft2')
  const [btuInput, setBtuInput] = useState('')

  const areaNum = Number(area) || 0
  const areaFt2 = unit === 'ft2' ? areaNum : areaNum * 10.7639
  const recommendedBtu = Math.round((areaFt2 * BTU_PER_FT2) / 1000) * 1000
  const recommendedTons = recommendedBtu / 12000

  const btuNum = Number(btuInput) || 0
  const tons = btuNum / 12000

  return (
    <div className="space-y-6 page-transition">
      <PageHeader title="Calculadora A/C" description="Estimaciones rápidas en sitio" />

      {/* Capacidad por área */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AirVent className="h-4 w-4 text-primary" />
            Capacidad recomendada por área
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Área del espacio</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej: 500"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidad</Label>
              <div className="flex bg-muted rounded-lg p-1">
                {(['ft2', 'm2'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      unit === u ? 'bg-card shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    {u === 'ft2' ? 'ft²' : 'm²'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {areaNum > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacidad estimada</span>
                <span className="font-semibold">{recommendedBtu.toLocaleString()} BTU</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Equivale a</span>
                <span className="font-semibold">{recommendedTons.toFixed(1)} ton</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Estimación general ({BTU_PER_FT2} BTU/ft²). Ajusta según aislamiento, ventanas, techos altos y ocupación.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversión BTU ↔ toneladas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            BTU ↔ Toneladas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">BTU</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ej: 24000"
              value={btuInput}
              onChange={(e) => setBtuInput(e.target.value)}
            />
          </div>
          {btuNum > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Toneladas de refrigeración</span>
              <span className="font-semibold">{tons.toFixed(2)} ton</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">1 tonelada = 12,000 BTU/h</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Calculator className="h-3.5 w-3.5" />
        Valores orientativos; verifica con cálculo de carga térmica.
      </p>
    </div>
  )
}
