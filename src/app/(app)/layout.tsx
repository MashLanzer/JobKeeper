export const dynamic = 'force-dynamic'

import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-28 min-h-[calc(100vh-56px)]">
        <div className="max-w-lg mx-auto px-4 py-5">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
