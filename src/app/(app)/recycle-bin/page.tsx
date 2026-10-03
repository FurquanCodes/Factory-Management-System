import { createClient } from '@supabase/supabase-js'
import { RecoverCustomerButton, RecoverInvoiceButton } from './RecoverButtons'

export default async function RecycleBinPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch deleted customers
  const { data: deletedCustomers } = await supabase
    .from('parties')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  // Fetch cancelled invoices
  const { data: cancelledInvoices } = await supabase
    .from('invoices')
    .select('*, party:parties(name)')
    .eq('status', 'cancelled')
    .order('cancelled_at', { ascending: false });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Recycle Bin
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          View and recover recently deleted customers and invoices.
        </p>
      </div>

      {/* Auto-Delete Notice */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4">
        <svg className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div>
          <h3 className="text-amber-800 font-bold">Important Notice</h3>
          <p className="text-amber-700 text-sm mt-1">
            Items in the Recycle Bin will be <strong>permanently deleted</strong> after 7 days. Please recover any important data before it is lost forever.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {/* Deleted Customers Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            Deleted Customers
            <span className="bg-slate-200 text-slate-600 text-sm py-1 px-3 rounded-full">{deletedCustomers?.length || 0}</span>
          </h2>
          {deletedCustomers && deletedCustomers.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-bold">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Deleted At</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{customer.name}</td>
                      <td className="px-6 py-4 text-slate-500">{customer.city}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(customer.deleted_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <RecoverCustomerButton id={customer.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium">
              No deleted customers found.
            </div>
          )}
        </section>

        {/* Deleted Invoices Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            Deleted Invoices
            <span className="bg-slate-200 text-slate-600 text-sm py-1 px-3 rounded-full">{cancelledInvoices?.length || 0}</span>
          </h2>
          {cancelledInvoices && cancelledInvoices.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-bold">
                  <tr>
                    <th className="px-6 py-4">Invoice No</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Deleted At</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cancelledInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">#{invoice.invoice_no}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {invoice.party ? invoice.party.name : invoice.party_name_snapshot}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">Rs {invoice.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(invoice.cancelled_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <RecoverInvoiceButton id={invoice.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium">
              No deleted invoices found.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
