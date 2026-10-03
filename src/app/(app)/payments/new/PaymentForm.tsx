'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { savePaymentAction } from '../actions';

type Debtor = { id: string; name: string; city: string; due_amount: number };
type UnpaidInvoice = { id: string; invoice_no: number; total_amount: number; party_id: string; invoice_date: string };

export default function PaymentForm({ debtors, unpaidInvoices }: { debtors: Debtor[], unpaidInvoices: UnpaidInvoice[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [partyId, setPartyId] = useState(searchParams.get('partyId') || '');
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [method, setMethod] = useState<'cash' | 'bank' | 'other'>('cash');
  const [invoiceId, setInvoiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Update amount automatically if a customer is selected and the field is empty
  useEffect(() => {
    if (partyId && !amount && !searchParams.get('amount')) {
      const selected = debtors.find(d => d.id === partyId);
      if (selected) setAmount(selected.due_amount.toString());
    }
  }, [partyId, amount, debtors, searchParams]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) return setError('Please select a customer.');
    if (!amount || Number(amount) <= 0) return setError('Please enter a valid amount.');

    setIsSaving(true);
    setError('');

    try {
      const payload = {
        partyId,
        date: new Date().toISOString().split('T')[0], // Today
        amount: Number(amount),
        method,
        invoiceId,
        notes
      };
      
      const res = await savePaymentAction(payload);
      if (res.success) {
        // Go back to outstanding list to see updated balance
        router.push('/outstanding');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save payment.');
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1">Select Customer (Only those with dues are listed) *</label>
        <select 
          required
          className="w-full text-lg p-3 border border-slate-300 rounded focus:border-emerald-500 outline-none bg-white font-bold text-slate-800"
          value={partyId}
          onChange={(e) => {
             setPartyId(e.target.value);
             // When changing customer, clear amount and invoice so it can auto-fill via useEffect
             setAmount('');
             setInvoiceId('');
          }}
        >
          <option value="">-- Choose Customer --</option>
          {debtors.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.city}) - Owe Rs {Number(c.due_amount).toLocaleString()}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row gap-4 border-t border-slate-100 pt-6">
        <div className="flex-1">
          <label className="block text-sm font-bold text-slate-500 mb-1">Amount Received *</label>
          <input 
            type="number"
            required
            min="1"
            className="w-full text-3xl font-black p-3 border border-slate-300 rounded focus:border-emerald-500 outline-none text-emerald-700"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-slate-500 mb-1">Payment Method</label>
          <select 
            className="w-full text-lg p-3 border border-slate-300 rounded focus:border-emerald-500 outline-none bg-white font-medium h-[60px]"
            value={method}
            onChange={(e: any) => setMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="other">Cheque / Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1">Select Invoice to Mark as Paid (Optional)</label>
        <select 
          className="w-full text-lg p-3 border border-slate-300 rounded focus:border-emerald-500 outline-none bg-white font-medium"
          value={invoiceId}
          onChange={(e) => {
            setInvoiceId(e.target.value);
            // Auto update amount to match invoice amount if they pick an invoice
            const inv = unpaidInvoices.find(i => i.id === e.target.value);
            if (inv) setAmount(inv.total_amount.toString());
          }}
          disabled={!partyId}
        >
          <option value="">-- No specific invoice (General payment) --</option>
          {unpaidInvoices.filter(i => i.party_id === partyId).map(i => {
            const displayDate = new Date(i.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return (
              <option key={i.id} value={i.id}>
                Invoice #{i.invoice_no} ({displayDate}) - Rs {Number(i.total_amount).toLocaleString()}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1">Notes (Optional)</label>
        <input 
          type="text"
          className="w-full text-lg p-3 border border-slate-300 rounded focus:border-emerald-500 outline-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Cleared pending bill"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 font-bold rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="border-t border-slate-200 pt-6 flex justify-end">
        <button 
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-emerald-600 text-white font-black text-xl rounded-lg shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Payment'}
        </button>
      </div>
    </form>
  )
}
