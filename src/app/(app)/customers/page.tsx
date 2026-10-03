import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
// Simple helper to group customers by city
function groupByCity(customers: any[]) {
  return customers.reduce((acc, customer) => {
    const city = customer.city || 'Unknown City';
    if (!acc[city]) acc[city] = [];
    acc[city].push(customer);
    return acc;
  }, {} as Record<string, any[]>);
}

export default async function CustomersPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: customers } = await supabase
    .from('parties')
    .select('*')
    .is('deleted_at', null)
    .order('name')
    
  const grouped = customers ? groupByCity(customers) : {};
  const cities = Object.keys(grouped).sort();

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 animate-fade-in-up">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
            Customers Directory
          </h1>
          <p className="mt-2 text-slate-500 font-medium text-lg">
            Manage your clients, dealers, and their balances.
          </p>
        </div>
        
        <Link href="/customers/new" className="group relative inline-flex items-center justify-center px-8 py-3.5 font-semibold text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">
          <svg className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add New Customer
        </Link>
      </div>

      {/* Grouped Lists */}
      <div className="space-y-16">
        {cities.map((city, index) => (
          <section 
            key={city} 
            className="animate-fade-in-up" 
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {city}
              </h2>
              <div className="ml-4 flex-grow h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
              <span className="ml-4 text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {grouped[city].length} Accounts
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {grouped[city].map((c: any) => (
                <Link
                  href={`/customers/${c.id}`} 
                  key={c.id} 
                  className="group relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-100 flex flex-col justify-between overflow-hidden cursor-pointer block"
                >
                  {/* Subtle hover gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">
                        {c.name}
                      </h3>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full capitalize shadow-sm shrink-0 ml-3 ${
                        c.type === 'dealer' 
                          ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-500/20' 
                          : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20'
                      }`}>
                        {c.type}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center text-slate-500 text-sm">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 shrink-0 group-hover:bg-blue-50 transition-colors">
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                          </svg>
                        </div>
                        <span className="font-medium">{c.phone || 'No phone recorded'}</span>
                      </div>
                      
                      <div className="flex items-center text-slate-500 text-sm">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 shrink-0 group-hover:bg-blue-50 transition-colors">
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                          </svg>
                        </div>
                        <span>View Detailed Khata / Ledger</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom animated border indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

    </div>
  )
}
