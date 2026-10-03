import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import '@/app/print.css' // Using the same print isolation we used for invoices
import PrintButton from './PrintButton'

export default async function OutstandingPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch outstanding balances
  const { data: outstandingData, error: outError } = await supabase
    .from('v_party_outstanding')
    .select('party_id, due_amount')
    .gt('due_amount', 0)
    .order('due_amount', { ascending: false });

  if (outError) console.error("Outstanding Error:", outError);

  // Fetch all parties to map their names and cities
  const { data: partiesData, error: partyError } = await supabase
    .from('parties')
    .select('id, name, city, phone');

  if (partyError) console.error("Parties Error:", partyError);

  // Merge the data in JavaScript
  const outstanding = outstandingData?.map(row => {
    const party = partiesData?.find(p => p.id === row.party_id);
    return {
      ...row,
      parties: party || { name: 'Unknown', city: '-' }
    };
  }) || [];

  const totalOutstanding = outstanding?.reduce((sum, row) => sum + Number(row.due_amount), 0) || 0;

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 pt-8">
      
      {/* ----------------- WEB APP UI (Hidden when printing) ----------------- */}
      <div className="noprint max-w-4xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Outstanding Balances</h1>
          <p className="text-lg text-slate-500 mt-1 font-medium">Master list of all customers with due amounts.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/payments/new" className="px-6 py-3 bg-emerald-600 text-white font-bold text-lg rounded-lg shadow-sm hover:bg-emerald-700 transition-colors">
            + Record Payment
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="noprint max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
              <th className="p-4 font-bold w-16 text-center">Sr #</th>
              <th className="p-4 font-bold">Customer Name</th>
              <th className="p-4 font-bold">City</th>
              <th className="p-4 font-bold text-right">Due Amount</th>
            </tr>
          </thead>
          <tbody>
            {outstanding?.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">No outstanding balances found.</td>
              </tr>
            ) : null}
            {outstanding?.map((row: any, index: number) => (
              <tr key={row.party_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                <td className="p-4 text-slate-800 font-bold">
                  {/* Link to their specific ledger later */}
                  <Link href={`/customers/${row.party_id}`} className="hover:text-blue-600 hover:underline">
                    {row.parties?.name || 'Unknown'}
                  </Link>
                </td>
                <td className="p-4 text-slate-600 font-medium">{row.parties?.city || '-'}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <span className="font-black text-red-600 text-lg">
                      Rs {Number(row.due_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                    <Link 
                      href={`/payments/new?partyId=${row.party_id}&amount=${row.due_amount}`}
                      className="noprint px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors rounded text-sm font-bold"
                    >
                      Settle Full
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td colSpan={3} className="p-4 text-right font-bold text-slate-600 uppercase tracking-wider text-sm">
                Total Outstanding
              </td>
              <td className="p-4 text-right font-black text-slate-800 text-2xl">
                Rs {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ----------------- EXACT A4 PRINT PAPER ----------------- */}
      <div className="paper" id="paper">
        <div className="ph" style={{ marginBottom: '20px' }}>
          <b>A One Sanitory Ware</b>
          <span>Outstanding Balances Report</span>
        </div>
        
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th style={{width: "50px"}}>Sr</th>
                <th>Customer Name</th>
                <th>City</th>
                <th className="r">Due Amount</th>
              </tr>
            </thead>
            <tbody>
              {outstanding?.map((row: any, i: number) => (
                <tr key={row.party_id}>
                  <td>{i + 1}</td>
                  <td><b>{row.parties?.name}</b></td>
                  <td>{row.parties?.city}</td>
                  <td className="r"><b>{Number(row.due_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tot">
                <td colSpan={3} className="r">Total Outstanding</td>
                <td className="r"><b>{totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  )
}
