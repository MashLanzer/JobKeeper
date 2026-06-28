export const dynamic = 'force-dynamic'

import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Fab } from '@/components/layout/fab'
import { LockGate } from '@/components/providers/lock-gate'
import { NotificationInit } from '@/components/providers/notification-init'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LockGate>
      <div className="min-h-screen bg-background">
        <NotificationInit />
        <Header />
        <main className="pb-nav min-h-[calc(100vh-56px)]">
          <div className="max-w-lg mx-auto px-4 py-6">
            {children}
          </div>
        </main>
        <Fab />
        <BottomNav />
      </div>
    </LockGate>
  )
}
