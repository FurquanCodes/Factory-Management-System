'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function recoverCustomerAction(customerId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  const { error } = await supabase
    .from('parties')
    .update({ deleted_at: null })
    .eq('id', customerId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  revalidatePath('/customers');
  revalidatePath('/recycle-bin');
  revalidatePath('/outstanding');
  
  return { success: true };
}

export async function recoverInvoiceAction(invoiceId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  // Un-cancel the invoice
  const { error: invError } = await supabase
    .from('invoices')
    .update({ status: 'final', cancelled_at: null })
    .eq('id', invoiceId)
    .eq('organization_id', orgId);

  if (invError) throw new Error(invError.message);

  // Un-delete associated payments
  const { error: paymentError } = await supabase
    .from('party_payments')
    .update({ deleted_at: null })
    .eq('invoice_id', invoiceId)
    .eq('organization_id', orgId);

  if (paymentError) throw new Error(paymentError.message);

  revalidatePath('/invoices');
  revalidatePath('/customers');
  revalidatePath('/recycle-bin');
  revalidatePath('/outstanding');

  return { success: true };
}
