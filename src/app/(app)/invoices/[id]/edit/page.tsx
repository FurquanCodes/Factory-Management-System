import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import InvoiceForm from '../../new/InvoiceForm'

export const dynamic = 'force-dynamic'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch everything in parallel
  const [
    { data: invoice },
    { data: items },
    { data: customers },
    { data: products },
    { data: grades },
    { data: sizes },
    { data: variants },
    { data: rates }
  ] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order', { ascending: true }),
    supabase.from('parties').select('*').order('name'),
    supabase.from('products').select('*').is('deleted_at', null).order('name'),
    supabase.from('grades').select('*').is('deleted_at', null),
    supabase.from('sizes').select('*').is('deleted_at', null),
    supabase.from('variants').select('*').is('deleted_at', null),
    supabase.from('v_current_rates').select('*')
  ]);

  if (!invoice) {
    return notFound()
  }

  if (invoice.status !== 'draft') {
    return (
      <div className="p-8 text-center mt-20">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Cannot Edit Finalized Invoice</h1>
        <p className="text-slate-600">Only draft invoices can be edited. This invoice is already {invoice.status}.</p>
      </div>
    )
  }

  // Combine items into invoice data
  const initialData = {
    ...invoice,
    items: items || []
  };

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
        <h1 className="text-2xl font-bold text-slate-800 mb-6 max-w-6xl mx-auto">Edit Draft Invoice #{invoice.invoice_no}</h1>
        <InvoiceForm 
          customers={customers || []} 
          inventory={inventory} 
          nextInvoiceNo={invoice.invoice_no} 
          initialData={initialData}
        />
      </div>
    </div>
  )
}
