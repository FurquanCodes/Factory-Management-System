import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Optional: Add authorization check if not using Vercel Cron
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString();

    // 1. Hard delete payments that have been soft-deleted for > 7 days
    await supabase
      .from('party_payments')
      .delete()
      .lt('deleted_at', dateString);

    // 2. Hard delete invoices that have been cancelled for > 7 days
    await supabase
      .from('invoices')
      .delete()
      .eq('status', 'cancelled')
      .lt('cancelled_at', dateString);

    // 3. Hard delete customers that have been soft-deleted for > 7 days
    await supabase
      .from('parties')
      .delete()
      .lt('deleted_at', dateString);

    return NextResponse.json({ success: true, message: "Old records deleted successfully." });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
