'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, AirVent, ArrowRightLeft, Thermometer, Plus, DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { cn, formatCurrency } from '@/lib/utils'

const BTU_PER_FT2 = 25 // estimación para clima cálido (residencial)

export default function CalculadoraPage() {
  const router = useRouter()
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState<'ft2' | 'm2'>('ft2')
  const [btuInput, setBtuInput] = useState('')

  // Ajustes de carga
  const [sunny, setSunny] = useState(false)
  const [highCeiling, setHighCeiling] = useState(false)
  const [kitchen, setKitchen] = useState(false)
  const [people, setPeople] = useState('')

  // Delta T
  const [returnT, setReturnT] = useState('')
  const [supplyT, setSupplyT] = useState('')

  // Conversor de temperatura
  const [tempVal, setTempVal] = useState('')
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('F')

  // Estimador de costo de instalación
  const [equipCost, setEquipCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [margin, setMargin] = useState('30')

  // Carga de gas por longitud de línea
  const [lineLen, setLineLen] = useState('')
  const [precharge, setPrecharge] = useState('15')
  const [ozPerFt, setOzPerFt] = useState('0.6')

  // Conversiones varias
  const [convType, setConvType] = useState<'long' | 'peso' | 'presion'>('long')
  const [convVal, setConvVal] = useState('')

  // Superheat / Subcooling
  const [shVal, setShVal] = useState('')
  const [scVal, setScVal] = useState('')

  const areaNum = Number(area) || 0
  const areaFt2 = unit === 'ft2' ? areaNum : areaNum * 10.7639
  let btu = areaFt2 * BTU_PER_FT2
  if (sunny) btu *= 1.1
  if (highCeiling) btu *= 1.1
  if (kitchen) btu += 4000
  const peopleNum = Number(people) || 0
  if (peopleNum > 2) btu += (peopleNum - 2) * 600
  const recommendedBtu = Math.round(btu / 1000) * 1000
  const recommendedTons = recommendedBtu / 12000

  const btuNum = Number(btuInput) || 0
  const tons = btuNum / 12000

  // Delta T: retorno − suministro (°F). Normal entre 15 y 20.
  const dt = returnT !== '' && supplyT !== '' ? Number(returnT) - Number(supplyT) : null
  const dtStatus =
    dt === null ? null : dt < 15 ? 'bajo' : dt > 20 ? 'alto' : 'normal'

  // Conversor
  const tv = Number(tempVal)
  const tempConverted =
    tempVal === '' || isNaN(tv) ? null : tempUnit === 'F' ? ((tv - 32) * 5) / 9 : (tv * 9) / 5 + 32

  // Estimador de costo: (equipo + mano de obra) con margen → precio a cotizar.
  const baseCost = (Number(equipCost) || 0) + (Number(laborCost) || 0)
  const marginNum = Number(margin) || 0
  const quoteTotal = Math.round(baseCost * (1 + marginNum / 100))
  const quoteProfit = quoteTotal - baseCost

  // Superheat / Subcooling: rango típico 8–12 °F (verifica nameplate).
  const evalRange = (v: string): { label: string; cls: string } | null => {
    if (v === '') return null
    const n = Number(v)
    if (isNaN(n)) return null
    if (n < 8) return { label: 'Bajo (posible sobrecarga / falta de flujo)', cls: 'text-pending' }
    if (n > 12) return { label: 'Alto (posible baja carga / restricción)', cls: 'text-pending' }
    return { label: 'En rango (8–12 °F) ✓', cls: 'text-money' }
  }
  const shStatus = evalRange(shVal)
  const scStatus = evalRange(scVal)

  // Gas adicional por longitud de línea (más allá de la carga de fábrica).
  const extraLen = Math.max(0, (Number(lineLen) || 0) - (Number(precharge) || 0))
  const extraGasOz = extraLen * (Number(ozPerFt) || 0)

  // Conversiones (ambos sentidos).
  const cv = Number(convVal)
  const convResult =
    convVal === '' || isNaN(cv)
      ? null
      : convType === 'long'
        ? { a: `${(cv * 0.3048).toFixed(2)} m`, b: `${(cv / 0.3048).toFixed(2)} ft` }
        : convType === 'peso'
          ? { a: `${(cv * 0.4536).toFixed(2)} kg`, b: `${(cv / 0.4536).toFixed(2)} lb` }
          : { a: `${(cv * 0.0689).toFixed(2)} bar`, b: `${(cv / 0.0689).toFixed(1)} psi` }

  const createQuoteFromEstimate = () => {
    sessionStorage.setItem(
      'prefill_job',
      JSON.stringify({
        title: 'Instalación A/C',
        category: 'A/C - Instalación',
        price: quoteTotal,
        description: `Estimado: equipo/materiales ${formatCurrency(Number(equipCost) || 0)} + mano de obra ${formatCurrency(Number(laborCost) || 0)}, margen ${marginNum}%.`,
      })
    )
    router.push('/trabajos/nuevo')
  }

  const createInstallJob = () => {
    sessionStorage.setItem(
      'prefill_job',
      JSON.stringify({
        title: `Instalación A/C ${recommendedTons.toFixed(1)} ton`,
        category: 'A/C - Instalación',
        description: `Capacidad estimada: ${recommendedBtu.toLocaleString()} BTU (${recommendedTons.toFixed(1)} ton) para ${areaNum} ${unit === 'ft2' ? 'ft²' : 'm²'}.`,
      })
    )
    router.push('/trabajos/nuevo')
  }

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
                      unit === u
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {u === 'ft2' ? 'ft²' : 'm²'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ajustes de carga */}
          <div className="space-y-2">
            <Label className="text-xs">Ajustes del espacio</Label>
            <div className="flex flex-wrap gap-2">
              {([
                ['Mucho sol', sunny, setSunny],
                ['Techo alto', highCeiling, setHighCeiling],
                ['Cocina', kitchen, setKitchen],
              ] as const).map(([label, val, set]) => (
                <button
                  key={label}
                  onClick={() => set((v) => !v)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
                    val ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Label className="text-xs whitespace-nowrap">Personas (habitual)</Label>
              <Input
                type="number"
                min="0"
                placeholder="2"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                className="h-8 w-20"
              />
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
                Estimación general ({BTU_PER_FT2} BTU/ft² + ajustes). Verifica con cálculo de carga térmica.
              </p>
              <Button size="sm" variant="outline" className="w-full mt-2" onClick={createInstallJob}>
                <Plus className="h-4 w-4 mr-1.5" />
                Crear trabajo de instalación
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estimador de costo de instalación */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Estimador de costo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Equipo / materiales</Label>
              <Input type="number" min="0" placeholder="0.00" value={equipCost} onChange={(e) => setEquipCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mano de obra</Label>
              <Input type="number" min="0" placeholder="0.00" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Margen (%)</Label>
            <Input type="number" min="0" placeholder="30" value={margin} onChange={(e) => setMargin(e.target.value)} />
          </div>
          {baseCost > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo base</span>
                <span className="font-medium">{formatCurrency(baseCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ganancia ({marginNum}%)</span>
                <span className="font-medium text-money">{formatCurrency(quoteProfit)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-border pt-1 mt-1">
                <span>Precio a cotizar</span>
                <span className="text-money">{formatCurrency(quoteTotal)}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2" onClick={createQuoteFromEstimate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Crear cotización con este precio
              </Button>
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

      {/* Delta T (split de temperatura) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            Delta T (split de temperatura)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Aire de retorno (°F)</Label>
              <Input type="number" placeholder="Ej: 75" value={returnT} onChange={(e) => setReturnT(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aire de suministro (°F)</Label>
              <Input type="number" placeholder="Ej: 57" value={supplyT} onChange={(e) => setSupplyT(e.target.value)} />
            </div>
          </div>
          {dt !== null && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delta T</span>
                <span className="font-semibold">{dt.toFixed(1)} °F</span>
              </div>
              <p
                className={cn(
                  'text-xs font-medium',
                  dtStatus === 'normal' && 'text-money',
                  dtStatus !== 'normal' && 'text-pending'
                )}
              >
                {dtStatus === 'normal' && 'Normal (15–20 °F) ✓'}
                {dtStatus === 'bajo' && 'Bajo: posible falta de refrigerante o exceso de flujo de aire'}
                {dtStatus === 'alto' && 'Alto: posible flujo de aire bajo o filtro/serpentín sucio'}
              </p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Lo normal es una caída de 15–20 °F entre retorno y suministro.</p>
        </CardContent>
      </Card>

      {/* Conversor de temperatura */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Conversor °C ↔ °F
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Temperatura</Label>
              <Input type="number" placeholder="Ej: 72" value={tempVal} onChange={(e) => setTempVal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidad</Label>
              <div className="flex bg-muted rounded-lg p-1">
                {(['F', 'C'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setTempUnit(u)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      tempUnit === u
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    °{u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {tempConverted !== null && (
            <div className="rounded-lg bg-muted/50 p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Equivale a</span>
              <span className="font-semibold">
                {tempConverted.toFixed(1)} °{tempUnit === 'F' ? 'C' : 'F'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Superheat / Subcooling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            Superheat / Subcooling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Superheat (°F)</Label>
              <Input type="number" placeholder="Ej: 10" value={shVal} onChange={(e) => setShVal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subcooling (°F)</Label>
              <Input type="number" placeholder="Ej: 10" value={scVal} onChange={(e) => setScVal(e.target.value)} />
            </div>
          </div>
          {(shStatus || scStatus) && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              {shStatus && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Superheat</span>
                  <span className={cn('font-medium text-right', shStatus.cls)}>{shStatus.label}</span>
                </div>
              )}
              {scStatus && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Subcooling</span>
                  <span className={cn('font-medium text-right', scStatus.cls)}>{scStatus.label}</span>
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Rango típico 8–12 °F. Usa siempre el objetivo del fabricante (nameplate).</p>
        </CardContent>
      </Card>

      {/* Carga de gas por longitud de línea */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AirVent className="h-4 w-4 text-primary" />
            Gas extra por longitud de línea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Línea (ft)</Label>
              <Input type="number" min="0" placeholder="Ej: 35" value={lineLen} onChange={(e) => setLineLen(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">De fábrica (ft)</Label>
              <Input type="number" min="0" value={precharge} onChange={(e) => setPrecharge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">oz / ft</Label>
              <Input type="number" min="0" step="0.1" value={ozPerFt} onChange={(e) => setOzPerFt(e.target.value)} />
            </div>
          </div>
          {Number(lineLen) > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Refrigerante adicional</span>
              <span className="font-semibold">{extraGasOz.toFixed(1)} oz ({extraLen} ft extra)</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Ajusta oz/ft según el fabricante (típico 0.5–0.65 oz/ft).</p>
        </CardContent>
      </Card>

      {/* Conversiones varias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Conversiones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex bg-muted rounded-lg p-1">
            {([['long', 'Longitud'], ['peso', 'Peso'], ['presion', 'Presión']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setConvType(v)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                  convType === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            type="number"
            placeholder={convType === 'long' ? 'pies / metros' : convType === 'peso' ? 'libras / kg' : 'psi / bar'}
            value={convVal}
            onChange={(e) => setConvVal(e.target.value)}
          />
          {convResult && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{convType === 'long' ? 'ft → m' : convType === 'peso' ? 'lb → kg' : 'psi → bar'}</span>
                <span className="font-semibold">{convResult.a}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{convType === 'long' ? 'm → ft' : convType === 'peso' ? 'kg → lb' : 'bar → psi'}</span>
                <span className="font-semibold">{convResult.b}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Calculator className="h-3.5 w-3.5" />
        Valores orientativos; verifica con cálculo de carga térmica.
      </p>
    </div>
  )
}
