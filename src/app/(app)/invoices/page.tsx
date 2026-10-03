import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import DeleteInvoiceButton from './DeleteInvoiceButton'

export default async function InvoiceHistoryPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch invoices with their customer details and check if they have a payment attached
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, parties(name), party_payments(id)')
    .order('invoice_no', { ascending: false })

  if (error) {
    console.error(error)
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Invoice History</h1>
            <p className="text-lg text-slate-500 mt-1 font-medium">View and manage all your past invoices.</p>
          </div>
          <Link href="/invoices/new" className="px-6 py-3 bg-blue-700 text-white font-bold text-lg rounded-lg shadow-sm hover:bg-blue-800 transition-colors">
            + Create New Invoice
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                <th className="p-4 font-bold">Invoice #</th>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Customer Name</th>
                <th className="p-4 font-bold text-right">Total Amount</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-center">Payment</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">No invoices found. Create one to get started!</td>
                </tr>
              ) : null}
              {invoices?.map((inv: any) => {
                const customerName = inv.party_name_snapshot || inv.parties?.name || 'Unknown'
                const displayDate = new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                
                const isPaid = inv.party_payments && inv.party_payments.length > 0;

                return (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">#{inv.invoice_no}</td>
                    <td className="p-4 text-slate-600 font-medium">{displayDate}</td>
                    <td className="p-4 text-slate-800 font-medium">{customerName}</td>
                    <td className="p-4 text-right font-black text-emerald-600">Rs {inv.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        inv.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                        inv.status === 'final' ? 'bg-slate-100 text-slate-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {inv.status === 'final' && (
                        isPaid ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">PAID</span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">DUE</span>
                        )
                      )}
                      {inv.status === 'draft' && <span className="text-slate-400 text-sm font-bold">-</span>}
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800 font-bold px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors inline-block">
                        View
                      </Link>
                      <DeleteInvoiceButton invoiceId={inv.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
