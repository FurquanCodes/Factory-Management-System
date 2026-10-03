import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Greeting from '@/app/components/Greeting'
import DeletePaymentButton from '@/app/(app)/payments/DeletePaymentButton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch all stats in parallel
  const [
    { count: totalInvoices },
    { count: totalCustomers },
    { count: totalProducts },
    { data: outstandingData },
    { data: recentInvoices },
    { data: recentPayments },
    { data: todayInvoices },
    { data: topDebtors },
  ] = await Promise.all([
    supabase.from('invoices').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
    supabase.from('parties').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('v_party_outstanding').select('due_amount'),
    supabase.from('invoices').select('*, parties(name)').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(5),
    supabase.from('party_payments').select('*, parties(name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('total_amount').eq('invoice_date', new Date().toISOString().split('T')[0]).neq('status', 'cancelled'),
    supabase.from('v_party_outstanding').select('party_id, due_amount, ...parties(name)').gt('due_amount', 0).order('due_amount', { ascending: false }).limit(5),
  ])

  // 2. Calculate totals
  // Only sum positive outstanding amounts (money owed to us). Negative means advance payment from customer.
  const totalOutstanding = outstandingData?.reduce((sum, r) => {
    const due = Number(r.due_amount || 0);
    return due > 0 ? sum + due : sum;
  }, 0) || 0;

  const todayTotal = todayInvoices?.reduce((sum, r) => sum + Number(r.total_amount || 0), 0) || 0
  const todayCount = todayInvoices?.length || 0

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      
      {/* Hero Greeting Section */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Greeting />
            <div className="flex gap-3">
              <Link href="/invoices/new" className="px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl hover:bg-white/25 transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                New Invoice
              </Link>
              <Link href="/payments/new" className="px-6 py-3 bg-emerald-500/80 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-emerald-500 transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                Record Payment
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-6">
        
        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          {/* Today's Sales */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Today</span>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">Today&apos;s Sales</p>
            <p className="text-3xl font-black text-slate-800">Rs {todayTotal.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1 font-medium">{todayCount} invoice{todayCount !== 1 ? 's' : ''} today</p>
          </div>

          {/* Total Outstanding */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Link href="/outstanding" className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider hover:bg-amber-100 transition-colors">View All</Link>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">Total Outstanding</p>
            <p className="text-3xl font-black text-amber-600">Rs {totalOutstanding.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1 font-medium">Across all customers</p>
          </div>

          {/* Total Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <Link href="/invoices" className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider hover:bg-emerald-100 transition-colors">View All</Link>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">Total Invoices</p>
            <p className="text-3xl font-black text-slate-800">{totalInvoices || 0}</p>
            <p className="text-sm text-slate-400 mt-1 font-medium">All time</p>
          </div>

          {/* Total Customers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <Link href="/customers" className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase tracking-wider hover:bg-purple-100 transition-colors">View All</Link>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">Customers</p>
            <p className="text-3xl font-black text-slate-800">{totalCustomers || 0}</p>
            <p className="text-sm text-slate-400 mt-1 font-medium">{totalProducts || 0} products in catalog</p>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { href: '/invoices/new', label: 'New Invoice', icon: '📝', color: 'from-blue-500 to-blue-600' },
            { href: '/invoices', label: 'Invoice History', icon: '📋', color: 'from-slate-500 to-slate-600' },
            { href: '/customers', label: 'Customers', icon: '👥', color: 'from-purple-500 to-purple-600' },
            { href: '/products', label: 'Products', icon: '📦', color: 'from-emerald-500 to-emerald-600' },
            { href: '/outstanding', label: 'Outstanding', icon: '💰', color: 'from-amber-500 to-amber-600' },
            { href: '/payments/new', label: 'Record Payment', icon: '💵', color: 'from-teal-500 to-teal-600' },
          ].map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center"
            >
              <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                {item.icon}
              </div>
              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Bottom Grid: Recent Activity + Top Debtors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          
          {/* Recent Invoices */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">Recent Invoices</h2>
              <Link href="/invoices" className="text-xs font-bold text-blue-600 hover:underline">See All →</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentInvoices?.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-medium">No invoices yet.</div>
              )}
              {recentInvoices?.map((inv: any) => {
                const customerName = inv.party_name_snapshot || inv.parties?.name || 'Unknown'
                const displayDate = new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-blue-50/50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">#{inv.invoice_no} · {customerName}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{displayDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-emerald-600">Rs {Number(inv.total_amount).toLocaleString()}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        inv.status === 'final' ? 'bg-slate-100 text-slate-600' :
                        inv.status === 'draft' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">Recent Payments</h2>
              <Link href="/payments/new" className="text-xs font-bold text-emerald-600 hover:underline">+ New Payment</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentPayments?.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-medium">No payments yet.</div>
              )}
              {recentPayments?.map((pay: any) => {
                const customerName = pay.parties?.name || 'Unknown'
                const displayDate = new Date(pay.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                const method = pay.method === 'cash' ? 'Cash' : pay.method === 'bank' ? 'Bank' : 'Other'
                return (
                  <div key={pay.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-emerald-50/50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{customerName}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{displayDate} · {method}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="font-black text-sm text-emerald-600">+ Rs {Number(pay.amount).toLocaleString()}</p>
                      <DeletePaymentButton paymentId={pay.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Debtors */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">Top Debtors</h2>
              <Link href="/outstanding" className="text-xs font-bold text-amber-600 hover:underline">Full List →</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {topDebtors?.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-medium">No outstanding dues.</div>
              )}
              {topDebtors?.map((d: any, i: number) => {
                return (
                  <Link key={d.party_id} href={`/customers/${d.party_id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${
                        i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-500'
                      }`}>
                        {i + 1}
                      </span>
                      <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                    </div>
                    <p className="font-black text-sm text-red-600">Rs {Number(d.due_amount).toLocaleString()}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
