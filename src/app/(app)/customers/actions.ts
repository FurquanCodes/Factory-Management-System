'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addCustomerAction(formData: FormData) {
  const name = formData.get('name') as string
  const city = formData.get('city') as string
  const phone = formData.get('phone') as string
  const type = formData.get('type') as string // 'dealer' or 'customer'
  const opening_balance = formData.get('opening_balance') as string

  if (!name) {
    throw new Error('Name is required')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get the default organization
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  const { data, error } = await supabase.from('parties').insert([
    {
      organization_id: orgId,
      name,
      city,
      phone: phone || null,
      type: type || 'customer',
      opening_balance: opening_balance ? parseFloat(opening_balance) : 0
    }
  ]).select('id').single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/customers')
  revalidatePath('/outstanding')
  revalidatePath('/invoices/new')
  
  return { id: data.id }
}

export async function deleteCustomerAction(customerId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  const { error } = await supabase
    .from('parties')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', customerId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  revalidatePath('/customers');
  revalidatePath('/outstanding');
  
  return { success: true };
}
