import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PrintButton from '@/app/(app)/outstanding/PrintButton'
import BackButton from '@/app/components/BackButton'
import '@/app/print.css'

export const dynamic = 'force-dynamic'

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch Invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, party_payments(id)')
    .eq('id', id)
    .single()

  if (!invoice) {
    return notFound()
  }

  // 2. Fetch Invoice Items
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  const isPaid = invoice.party_payments && invoice.party_payments.length > 0;
  const displayDate = new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8">
      
      {/* ----------------- WEB APP UI ----------------- */}
      <div className="noprint max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <BackButton />
            <h1 className="text-3xl font-black text-slate-800">Invoice #{invoice.invoice_no}</h1>
            <p className="text-lg text-slate-500 font-medium">{displayDate}</p>
          </div>
          
          <div className="flex gap-4">
            <PrintButton />
          </div>
        </div>


      </div>

      {/* ----------------- EXACT A4 PRINT PAPER ----------------- */}
      <div className="paper relative mx-auto mt-8" id="paper">
        
        {/* PAID/DUE Stamp Overlay */}
        {invoice.status === 'final' && isPaid && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ opacity: 0.08 }}>
            <div className="text-emerald-700 border-[10px] border-emerald-700 rounded-2xl px-16 py-6 font-black tracking-[0.2em] uppercase transform -rotate-45" style={{ fontSize: '120px', lineHeight: '1' }}>
              PAID
            </div>
          </div>
        )}
        {invoice.status === 'final' && !isPaid && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ opacity: 0.08 }}>
            <div className="text-blue-700 border-[10px] border-blue-700 rounded-2xl px-16 py-6 font-black tracking-[0.2em] uppercase transform -rotate-45" style={{ fontSize: '120px', lineHeight: '1' }}>
              DUE
            </div>
          </div>
        )}

        <div className="ph relative z-20">
          <div className="ph-left">
            <b>A One Sanitory Ware</b>
            <span>Hafizabad Road, Gujranwala</span>
          </div>
          <div className="ph-right">
            INVOICE
          </div>
        </div>
        
        <div className="meta relative z-20">
          <div className="meta-col">
            <div className="meta-item"><span>Customer Name</span><b id="pc">{invoice.party_name_snapshot}</b></div>
            <div className="meta-item"><span>City</span><b id="py">{invoice.party_city_snapshot}</b></div>
          </div>
          <div className="meta-col">
            <div className="meta-item"><span>Invoice No</span><b id="pn">{invoice.invoice_no}</b></div>
            <div className="meta-item"><span>Invoice Date</span><b id="pd">{displayDate}</b></div>
          </div>
        </div>
        
        <div className="scroll relative z-20">
          <table>
            <thead>
              <tr>
                <th style={{width: "44px"}}>Sr</th>
                <th>Description of Goods</th>
                <th className="r">Qty</th>
                <th className="r">Price</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody id="pb">
              {items?.map((item: any, i: number) => {
                return (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td>{item.description}</td>
                    <td className="r">{item.quantity && item.unit ? `${item.quantity} ${item.unit}` : ''}</td>
                    <td className="r">{item.rate ? `Rs ${item.rate} / ${item.unit}` : ''}</td>
                    <td className="r text-lg font-bold">Rs {Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="tot">
                <td colSpan={4}>TOTAL</td>
                <td className="r"><b id="pt">Rs {Number(invoice.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
