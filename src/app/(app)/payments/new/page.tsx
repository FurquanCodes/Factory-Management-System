import { createClient } from '@supabase/supabase-js'
import PaymentForm from './PaymentForm'

export default async function NewPaymentPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch only customers who owe money
  const { data: outstandingData } = await supabase
    .from('v_party_outstanding')
    .select('party_id, due_amount')
    .gt('due_amount', 0)
    .order('due_amount', { ascending: false });

  // Fetch unpaid invoices
  const { data: unpaidInvoicesData } = await supabase
    .from('invoices')
    .select('id, invoice_no, total_amount, party_id, invoice_date, party_payments(id)')
    .eq('status', 'final')
    .not('party_id', 'is', null);

  const unpaidInvoices = unpaidInvoicesData?.filter(inv => !inv.party_payments || inv.party_payments.length === 0) || [];

  const { data: partiesData } = await supabase.from('parties').select('id, name, city');

  const debtors = outstandingData?.map(row => {
    const party = partiesData?.find(p => p.id === row.party_id);
    return {
      id: row.party_id,
      name: party?.name || 'Unknown',
      city: party?.city || '',
      due_amount: row.due_amount
    };
  }) || [];

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 pt-8">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-black text-slate-800">Record Payment</h1>
        <p className="text-lg text-slate-500 mt-1 font-medium">Record cash, bank, or cheque receipts from customers.</p>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <PaymentForm debtors={debtors} unpaidInvoices={unpaidInvoices} />
      </div>
    </div>
  )
}
