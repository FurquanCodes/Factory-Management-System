'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addProductAction(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  if (!orgs || orgs.length === 0) throw new Error('No organization found')
  const orgId = orgs[0].id

  const name = formData.get('name') as string
  if (!name || name.trim().length === 0) throw new Error('Product name is required')

  const { data, error } = await supabase.from('products').insert({
    organization_id: orgId,
    name: name.trim(),
    is_active: true
  }).select('id').single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A product with this name already exists.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/products')
  return { success: true, id: data.id }
}

export async function setRatesAction(payload: any[]) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const orgId = orgs![0].id

  // payload = [{ variant_id: "...", rate: 100, rate_unit: "dozen" }]
  const rowsToInsert = payload.map(p => ({
    organization_id: orgId,
    variant_id: p.variant_id,
    rate: p.rate,
    rate_unit: p.rate_unit
  }))

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from('rates').insert(rowsToInsert)
    if (error) throw new Error(error.message)
  }
  
  revalidatePath('/products')
  return { success: true }
}

export async function addQualityAction(productId: string, name: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const { error } = await supabase.from('grades').insert({
    organization_id: orgs![0].id,
    product_id: productId,
    name: name.trim()
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/products/${productId}`)
  revalidatePath('/products')
  return { success: true }
}

export async function addSizeAction(productId: string, label: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const { error } = await supabase.from('sizes').insert({
    organization_id: orgs![0].id,
    product_id: productId,
    label: label.trim()
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/products/${productId}`)
  revalidatePath('/products')
  return { success: true }
}

export async function deleteProductAction(productId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/products')
  return { success: true }
}

export async function deleteQualityAction(productId: string, qualityId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await supabase.from('grades').update({ deleted_at: new Date().toISOString() }).eq('id', qualityId)
  if (error) throw new Error(error.message)
  await supabase.from('variants').update({ deleted_at: new Date().toISOString() }).eq('grade_id', qualityId)
  revalidatePath(`/products/${productId}`)
  revalidatePath('/products')
  return { success: true }
}

export async function deleteSizeAction(productId: string, sizeId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await supabase.from('sizes').update({ deleted_at: new Date().toISOString() }).eq('id', sizeId)
  if (error) throw new Error(error.message)
  await supabase.from('variants').update({ deleted_at: new Date().toISOString() }).eq('size_id', sizeId)
  revalidatePath(`/products/${productId}`)
  revalidatePath('/products')
  return { success: true }
}
