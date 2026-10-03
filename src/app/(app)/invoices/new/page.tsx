import { createClient } from '@supabase/supabase-js'
import InvoiceForm from './InvoiceForm'

export default async function NewInvoicePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch customers
  const { data: customers } = await supabase.from('parties').select('*').order('name')
  
  // Fetch full inventory hierarchy
  const { data: products } = await supabase.from('products').select('*').is('deleted_at', null).order('name')
  const { data: grades } = await supabase.from('grades').select('*').is('deleted_at', null)
  const { data: sizes } = await supabase.from('sizes').select('*').is('deleted_at', null)
  const { data: variants } = await supabase.from('variants').select('*').is('deleted_at', null)
  const { data: rates } = await supabase.from('v_current_rates').select('*')

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
  
  return (
    <div className="w-full min-h-screen bg-slate-50 pt-8">
      {/* Main Form Area */}
      <div className="px-4">
        <InvoiceForm customers={customers || []} inventory={inventory} />
      </div>
    </div>
  )
}
