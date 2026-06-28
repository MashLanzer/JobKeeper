'use client'

import { useEffect, useState } from 'react'
import { Lock, Delete } from 'lucide-react'
import { getPin, isUnlocked, markUnlocked } from '@/lib/pin'

export function LockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const pin = getPin()
    setLocked(!!pin && !isUnlocked())
    setReady(true)
  }, [])

  const press = (digit: string) => {
    setError(false)
    const next = (input + digit).slice(0, 8)
    setInput(next)
    const pin = getPin()
    if (pin && next.length >= pin.length) {
      if (next === pin) {
        markUnlocked()
        setLocked(false)
        setInput('')
      } else {
        setError(true)
        setInput('')
      }
    }
  }

  const backspace = () => {
    setError(false)
    setInput((v) => v.slice(0, -1))
  }

  if (!ready) return null
  if (!locked) return <>{children}</>

  const pinLen = getPin()?.length || 4

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <h1 className="text-lg font-semibold mb-1">WorkLedger</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {error ? 'PIN incorrecto, intenta de nuevo' : 'Ingresa tu PIN'}
      </p>

      {/* Dots */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: pinLen }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < input.length ? 'bg-primary border-primary' : 'border-muted-foreground/30'
            } ${error ? 'border-destructive' : ''}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 rounded-full bg-muted text-xl font-semibold active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          onClick={() => press('0')}
          className="h-16 rounded-full bg-muted text-xl font-semibold active:scale-95 transition-transform"
        >
          0
        </button>
        <button
          onClick={backspace}
          className="h-16 rounded-full flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          aria-label="Borrar"
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
