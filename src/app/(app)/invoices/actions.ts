'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function saveInvoiceAction(payload: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get the single organization for development
  const { data: orgs } = await supabase.from('organizations').select('id, timezone').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  // 2. Resolve Customer
  let partyId = payload.selectedCustomer || null;
  let partyName = null;
  let partyCity = null;

  if (partyId) {
    const { data: party } = await supabase.from('parties').select('name, city').eq('id', partyId).single();
    if (party) {
      partyName = party.name;
      partyCity = party.city;
    }
  } else {
    partyName = payload.walkinName;
    partyCity = payload.walkinCity;

    if (payload.saveNewCustomer) {
      const { data: newParty, error: newPartyError } = await supabase.from('parties').insert({
        organization_id: orgId,
        name: partyName,
        city: partyCity,
        type: 'customer',
        opening_balance: 0
      }).select('id').single();

      if (newPartyError) {
        throw new Error("Failed to save new customer. Name and City might already exist. " + newPartyError.message);
      }
      partyId = newParty.id;
    }
  }

  if (!partyName || !partyCity) throw new Error('Customer Name and City are required');

  let invoiceId = payload.invoiceId;
  let nextNo = 0;

  if (!invoiceId) {
    // 3. Increment Counter (Simple manual increment for dev) ONLY if new
    const { data: counter } = await supabase.from('invoice_counters').select('last_no').eq('organization_id', orgId).single();
    nextNo = (counter?.last_no || 0) + 1;
    
    await supabase.from('invoice_counters').upsert({
      organization_id: orgId,
      last_no: nextNo
    });
  }

  // 4. Insert or Update Invoice
  const initialStatus = payload.isFinal ? 'final' : 'draft';
  
  if (invoiceId) {
    // Update existing draft
    const { data: currentInv } = await supabase.from('invoices').select('status').eq('id', invoiceId).single();
    if (currentInv?.status !== 'draft') throw new Error("Only draft invoices can be edited");

    const { error: invError } = await supabase.from('invoices').update({
      party_id: partyId,
      party_name_snapshot: partyName,
      party_city_snapshot: partyCity,
      total_amount: payload.totalAmount,
      status: initialStatus,
      finalized_at: payload.isFinal ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq('id', invoiceId);

    if (invError) throw new Error(invError.message);

    // Delete existing items so we can re-insert them cleanly
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
  } else {
    // Insert new invoice
    const { data: invData, error: invError } = await supabase.from('invoices').insert({
      organization_id: orgId,
      invoice_no: nextNo,
      party_id: partyId,
      party_name_snapshot: partyName,
      party_city_snapshot: partyCity,
      invoice_date: new Date().toISOString().split('T')[0],
      total_amount: payload.totalAmount,
      status: initialStatus,
      finalized_at: payload.isFinal ? new Date().toISOString() : null
    }).select('id').single();

    if (invError) throw new Error(invError.message);
    invoiceId = invData.id;
  }

  // 5. Insert Items
  const itemsToInsert = payload.items.map((item: any, idx: number) => ({
    organization_id: orgId,
    invoice_id: invoiceId,
    sort_order: idx + 1,
    variant_id: item.variantId,
    description: `${item.productName} ${item.sizeName} (${item.qualityName})`,
    quantity: item.qty,
    unit: item.unit ? item.unit.toLowerCase() : 'piece',
    rate: item.rate,
    amount: item.amount
  }));

  const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
  if (itemsError) {
    if (!payload.invoiceId) {
      // Only delete the invoice if it was a newly created one
      await supabase.from('invoices').delete().eq('id', invoiceId);
    }
    throw new Error(itemsError.message);
  }

  // 6. Record Payment if paid
  if (payload.isFinal && payload.paymentStatus === 'paid') {
    // Only insert into party_payments if it's a registered customer
    if (partyId) {
      const { error: paymentError } = await supabase.from('party_payments').insert({
        organization_id: orgId,
        party_id: partyId,
        payment_date: new Date().toISOString().split('T')[0],
        amount: payload.totalAmount,
        method: payload.paymentMethod || 'cash',
        invoice_id: invoiceId,
        notes: 'Paid immediately on invoice creation'
      });
      if (paymentError) throw new Error(paymentError.message);
    }
  }

  revalidatePath('/invoices');
  revalidatePath('/outstanding');
  
  // Return success so the client can redirect or show a message
  return { success: true, invoiceId };
}

export async function deleteInvoiceAction(invoiceId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) throw new Error('No organization found');
  const orgId = orgs[0].id;

  // 1. Soft delete associated payments first
  const { error: paymentError } = await supabase
    .from('party_payments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('invoice_id', invoiceId)
    .eq('organization_id', orgId);

  if (paymentError) throw new Error(paymentError.message);

  // 2. Soft delete the invoice by setting status to cancelled
  const { error: invError } = await supabase
    .from('invoices')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('organization_id', orgId);

  if (invError) throw new Error(invError.message);

  revalidatePath('/invoices');
  revalidatePath('/customers');
  revalidatePath('/outstanding');
  
  return { success: true };
}
