import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import '@/app/print.css' // Reuse A4 print styling
import PrintButton from '@/app/(app)/outstanding/PrintButton'
import BackButton from '@/app/components/BackButton'
import DeleteInvoiceButton from '@/app/(app)/invoices/DeleteInvoiceButton'
import DeletePaymentButton from '@/app/(app)/payments/DeletePaymentButton'
import DeleteCustomerButton from '@/app/(app)/customers/DeleteCustomerButton'
import { notFound } from 'next/navigation'

// We force dynamic because this is an individual customer page
export const dynamic = 'force-dynamic'

export default async function CustomerLedgerPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params;
  const { tab = 'ledger' } = await searchParams;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch Customer Details
  const { data: customer } = await supabase
    .from('parties')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) {
    return notFound()
  }

  // 2. Fetch Ledger Rows
  const { data: ledgerRows, error } = await supabase
    .from('v_party_ledger')
    .select('*')
    .eq('party_id', id)
    .order('dt', { ascending: true, nullsFirst: true })
    .order('ts', { ascending: true })
    .order('ref_id', { ascending: true })

  if (error) console.error(error)

  const currentDue = ledgerRows && ledgerRows.length > 0 
    ? ledgerRows[ledgerRows.length - 1].due_amount 
    : 0

  // 3. Fetch Invoices if on invoices tab
  let invoices: any[] = [];
  if (tab === 'invoices') {
    const { data: invs } = await supabase
      .from('invoices')
      .select('*, party_payments(id)')
      .eq('party_id', id)
      .order('invoice_no', { ascending: false });
    if (invs) invoices = invs;
  }
  const formatBalance = (amountRaw: any) => {
    const amount = Number(amountRaw || 0);
    if (amount < 0) return Math.abs(amount).toLocaleString(undefined, {minimumFractionDigits: 2}) + ' (Advance)';
    return amount.toLocaleString(undefined, {minimumFractionDigits: 2});
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 pt-8">
      
      {/* ----------------- WEB APP UI ----------------- */}
      <div className="noprint max-w-6xl mx-auto mb-8">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <BackButton />
            <h1 className="text-3xl font-black text-slate-800">{customer.name}</h1>
            <p className="text-lg text-slate-500 font-medium">{customer.city} {customer.phone ? `| ${customer.phone}` : ''}</p>
          </div>
          
          <div className="flex gap-4">
            <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
            <Link 
              href={`/payments/new?partyId=${customer.id}&amount=${currentDue}`}
              className="px-6 py-3 bg-emerald-600 text-white font-bold text-lg rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
            >
              + Record Payment
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-300 mb-6 gap-8">
          <Link href={`?tab=ledger`} className={`pb-3 border-b-4 font-black text-lg transition-colors ${tab === 'ledger' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Ledger (Khata)</Link>
          <Link href={`?tab=invoices`} className={`pb-3 border-b-4 font-black text-lg transition-colors ${tab === 'invoices' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Invoices</Link>
          <button className="pb-3 border-b-4 border-transparent text-slate-300 font-bold text-lg cursor-not-allowed">Payments</button>
        </div>

        {/* Tab Content */}
        {tab === 'ledger' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Summary Header */}
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
              <div>
                <h2 className="text-xl font-bold text-slate-200">Current Balance</h2>
              </div>
              <div className="text-3xl font-black text-emerald-400">
                Rs {formatBalance(currentDue)}
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Details</th>
                  <th className="p-4 font-bold text-right text-red-600">Bill (Dr)</th>
                  <th className="p-4 font-bold text-right text-emerald-600">Received (Cr)</th>
                  <th className="p-4 font-bold text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows?.map((row: any, index: number) => {
                  let dateStr = '-';
                  if (row.dt) {
                    const d = new Date(row.dt);
                    dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
                  }
                  let timeStr = '';
                  if (row.ts) {
                    const t = new Date(row.ts);
                    timeStr = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  }
                  return (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                        {dateStr}
                        {timeStr && <span className="block text-xs text-slate-400 mt-0.5">{timeStr}</span>}
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {row.details}
                        {row.kind === 'invoice' && row.ref_id && (
                          <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">View</span>
                        )}
                        {row.kind === 'payment' && row.ref_id && (
                          <span className="ml-2 inline-flex items-center">
                            <DeletePaymentButton paymentId={row.ref_id} />
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-medium text-red-500">
                        {Number(row.bill) > 0 ? Number(row.bill).toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                      </td>
                      <td className="p-4 text-right font-medium text-emerald-500">
                        {Number(row.received) > 0 ? Number(row.received).toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800 text-lg">
                        {formatBalance(row.due_amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'invoices' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <th className="p-4 font-bold">Invoice #</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold text-right">Total Amount</th>
                  <th className="p-4 font-bold text-center">Status</th>
                  <th className="p-4 font-bold text-center">Payment</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No invoices found for this customer.</td>
                  </tr>
                ) : null}
                {invoices?.map((inv: any) => {
                  const displayDate = new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  const isPaid = inv.party_payments && inv.party_payments.length > 0;

                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">#{inv.invoice_no}</td>
                      <td className="p-4 text-slate-600 font-medium">{displayDate}</td>
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
        )}
      </div>

      {/* ----------------- EXACT A4 PRINT PAPER ----------------- */}
      <div className="paper mx-auto mt-16" id="paper">
        <div className="ph" style={{ marginBottom: '20px' }}>
          <b>A One Sanitory Ware</b>
          <span>Customer Ledger</span>
        </div>
        
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{customer.name}</div>
            <div>{customer.city} {customer.phone ? `| ${customer.phone}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Current Balance:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rs {formatBalance(currentDue)}</div>
          </div>
        </div>

        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Details</th>
                <th className="r">Bill Amount</th>
                <th className="r">Received</th>
                <th className="r">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows?.map((row: any, i: number) => {
                let dateStr = '-';
                if (row.dt) {
                  const d = new Date(row.dt);
                  dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
                }
                let timeStr = '';
                if (row.ts) {
                  const t = new Date(row.ts);
                  timeStr = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                }
                return (
                  <tr key={i}>
                    <td>
                      <div>{dateStr}</div>
                      {timeStr && <div style={{ fontSize: '0.8em', color: '#666' }}>{timeStr}</div>}
                    </td>
                    <td><b>{row.details}</b></td>
                    <td className="r">{Number(row.bill) > 0 ? Number(row.bill).toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                    <td className="r">{Number(row.received) > 0 ? Number(row.received).toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                    <td className="r"><b>{formatBalance(row.due_amount)}</b></td>
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
