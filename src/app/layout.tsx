import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { NativeAuthListener } from '@/components/providers/native-auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WorkLedger - Gestión de Trabajos',
  description: 'Gestiona tus trabajos, clientes y finanzas en un solo lugar',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <NativeAuthListener />
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
