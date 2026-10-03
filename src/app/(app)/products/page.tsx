import { createClient } from '@supabase/supabase-js'
import ProductList from './ProductList'
import Link from 'next/link'

export default async function ProductsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch products and their variants + rates
  const { data: products } = await supabase.from('products').select('*').is('deleted_at', null).order('name')
  const { data: grades } = await supabase.from('grades').select('*').is('deleted_at', null)
  const { data: sizes } = await supabase.from('sizes').select('*').is('deleted_at', null)
  const { data: variants } = await supabase.from('variants').select('*').is('deleted_at', null)
  const { data: rates } = await supabase.from('v_current_rates').select('*')

  // Group everything by product for display
  const productList = products?.map(product => {
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
    <div className="w-full min-h-screen bg-slate-50">
      
      {/* Professional Full-Width Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Products & Pricing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your inventory items, qualities, sizes, and rates.
          </p>
        </div>
        
        <Link href="/products/new" className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm transition-colors flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New Product
        </Link>
      </div>

      {/* Main Content Area (Utilizing Desktop Space) */}
      <div className="p-6 w-full max-w-[98%] mx-auto">
        <ProductList productList={productList} />
      </div>

    </div>
  )
}
