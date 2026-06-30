'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { applyAccent } from '@/lib/accent'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored)
      document.documentElement.classList.toggle('dark', stored === 'dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    applyAccent() // aplica el color de acento guardado
  }, [])

  // Sincroniza la barra de estado nativa con el tema (solo en la app).
  useEffect(() => {
    ;(async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
        await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0e1729' : '#ffffff' }).catch(() => {})
      } catch {
        // plugin no disponible
      }
    })()
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
