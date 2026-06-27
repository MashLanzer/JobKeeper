'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  initial?: string | null
  onSave: (dataUrl: string) => void
  onClear?: () => void
}

export function SignaturePad({ initial, onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasDrawn = useRef(false)
  const [editing, setEditing] = useState(!initial)

  // Ajusta la resolución interna del canvas al tamaño en pantalla.
  useEffect(() => {
    if (!editing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#111827'
    }
  }, [editing])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasDrawn.current = true
  }

  const end = () => {
    drawing.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
  }

  const handleSave = () => {
    if (!hasDrawn.current) return
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    onSave(dataUrl)
    setEditing(false)
  }

  if (!editing && initial) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={initial}
          alt="Firma del cliente"
          className="w-full h-32 object-contain rounded-lg border border-border bg-white"
        />
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="w-full">
          Firmar de nuevo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-32 rounded-lg border border-dashed border-border bg-white touch-none"
      />
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearCanvas()
            onClear?.()
          }}
          className="flex-1"
        >
          Limpiar
        </Button>
        <Button size="sm" onClick={handleSave} className="flex-1">
          Guardar firma
        </Button>
      </div>
    </div>
  )
}
