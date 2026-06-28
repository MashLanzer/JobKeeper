'use client'

import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
}

const THRESHOLD = 64
const MAX_PULL = 90

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const active = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY
      active.current = true
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!active.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) {
      setPull(Math.min(dy * 0.5, MAX_PULL))
    } else {
      active.current = false
      setPull(0)
    }
  }

  const onTouchEnd = async () => {
    if (!active.current) return
    active.current = false
    if (pull >= THRESHOLD) {
      setRefreshing(true)
      setPull(THRESHOLD / 2)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  const showSpinner = refreshing || pull > 8

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pull }}
      >
        {showSpinner && (
          <Loader2
            className={`h-5 w-5 text-primary ${refreshing ? 'animate-spin' : ''}`}
            style={{ opacity: Math.min(1, pull / THRESHOLD) }}
          />
        )}
      </div>
      <div style={{ transform: `translateY(${refreshing ? 0 : 0}px)` }}>{children}</div>
    </div>
  )
}
