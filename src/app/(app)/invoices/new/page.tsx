import { createClient } from '@supabase/supabase-js'
import InvoiceForm from './InvoiceForm'

export default async function NewInvoicePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch all required data in parallel to reduce load time
  const [
    { data: customers },
    { data: products },
    { data: grades },
    { data: sizes },
    { data: variants },
    { data: rates },
    { data: counters }
  ] = await Promise.all([
    supabase.from('parties').select('*').order('name'),
    supabase.from('products').select('*').is('deleted_at', null).order('name'),
    supabase.from('grades').select('*').is('deleted_at', null),
    supabase.from('sizes').select('*').is('deleted_at', null),
    supabase.from('variants').select('*').is('deleted_at', null),
    supabase.from('v_current_rates').select('*'),
    supabase.from('invoice_counters').select('last_no').limit(1)
  ]);

  // Group into a nested structure for the client
  const inventory = products?.map(product => {
    const pGrades = grades?.filter(g => g.product_id === product.id) || []
    const pSizes = sizes?.filter(s => s.product_id === product.id) || []
    const pVariants = variants?.filter(v => v.product_id === product.id) || []
    
    return {
      ...product,
      grades: pGrades,
      sizes: pSizes,
      variants: pVariants.map(v => ({
        ...v,
        grade: pGrades.find(g => g.id === v.grade_id),
        size: pSizes.find(s => s.id === v.size_id),
        rate: rates?.find(r => r.variant_id === v.id)
      }))
    }
  }) || []
  const nextInvoiceNo = counters && counters.length > 0 ? counters[0].last_no + 1 : 1
  
  return (
    <div className="w-full min-h-screen bg-slate-50 pt-8">
      {/* Main Form Area */}
      <div className="px-4">
        <InvoiceForm customers={customers || []} inventory={inventory} nextInvoiceNo={nextInvoiceNo} />
      </div>
    </div>
  )
}
