'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function savePaymentAction(payload: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the single organization for development
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  const { error } = await supabase.from('party_payments').insert([
    {
      organization_id: orgId,
      party_id: payload.partyId,
      payment_date: payload.date,
      amount: payload.amount,
      method: payload.method,
      invoice_id: payload.invoiceId || null,
      notes: payload.notes
    }
  ]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/outstanding');
  revalidatePath('/invoices');
  
  return { success: true };
}
