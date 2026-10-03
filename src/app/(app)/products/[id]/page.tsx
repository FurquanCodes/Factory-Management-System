import { createClient } from '@supabase/supabase-js'
import BackButton from '@/app/components/BackButton'
import ProductEditor from './ProductEditor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProductDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) return notFound()

  // Fetch related data in parallel
  const [
    { data: qualities },
    { data: sizes },
    { data: variants }
  ] = await Promise.all([
    supabase.from('grades').select('*').eq('product_id', id).is('deleted_at', null).order('sort_order').order('created_at'),
    supabase.from('sizes').select('*').eq('product_id', id).is('deleted_at', null).order('sort_order').order('created_at'),
    supabase.from('variants').select('*, grades(name), sizes(label)').eq('product_id', id).is('deleted_at', null)
  ])

  // Fetch Rates
  const variantIds = variants?.map((v: any) => v.id) || []
  let rates: any[] = []
  if (variantIds.length > 0) {
    const { data: currentRates } = await supabase
      .from('v_current_rates')
      .select('*')
      .in('variant_id', variantIds)
    rates = currentRates || []
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <BackButton />
          <h1 className="text-3xl font-black text-slate-800">{product.name}</h1>
          <p className="text-lg text-slate-500 mt-1 font-medium">Manage qualities, sizes, and pricing for this product.</p>
        </div>

        <ProductEditor 
          product={product} 
          qualities={qualities || []} 
          sizes={sizes || []} 
          variants={variants || []} 
          rates={rates || []} 
        />
      </div>
    </div>
  )
}
