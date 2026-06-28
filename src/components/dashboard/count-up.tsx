'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  format: (n: number) => string
  duration?: number
}

/** Anima un número desde 0 hasta `value` con easing al montar/cambiar. */
export function CountUp({ value, format, duration = 700 }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <>{format(display)}</>
}
