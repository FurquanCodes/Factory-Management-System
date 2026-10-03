export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF]">
      <header className="noprint h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-sm">
        <div className="flex items-center gap-8">
          <a href="/dashboard" className="font-black text-xl text-blue-700 tracking-tight hover:text-blue-800 transition-colors">
            A One Sanitory Ware
          </a>
          <nav className="hidden md:flex items-center gap-6 font-bold text-slate-500">
            <a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a>
            <a href="/customers" className="hover:text-blue-600 transition-colors">Customers</a>
            <a href="/products" className="hover:text-blue-600 transition-colors">Products</a>
            <a href="/invoices/new" className="hover:text-blue-600 transition-colors">New Invoice</a>
            <a href="/invoices" className="hover:text-blue-600 transition-colors">Invoice History</a>
            <a href="/outstanding" className="hover:text-blue-600 transition-colors">Outstanding</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a href="/payments/new" className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded font-bold text-sm transition-colors mr-4">
            + Record Payment
          </a>
          <span className="text-sm cursor-pointer hover:underline text-slate-500 font-medium">English | اردو</span>
          <button className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded font-bold text-sm transition-colors">Logout</button>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
