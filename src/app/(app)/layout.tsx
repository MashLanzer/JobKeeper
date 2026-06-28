export const dynamic = 'force-dynamic'

import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { LockGate } from '@/components/providers/lock-gate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LockGate>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pb-28 min-h-[calc(100vh-56px)]">
          <div className="max-w-lg mx-auto px-4 py-6">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </LockGate>
  )
}
