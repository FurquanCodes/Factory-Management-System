export const dynamic = 'force-dynamic';

import TopNav from '@/app/components/TopNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF]">
      <TopNav />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
