'use client';

import { useState } from 'react';
import { deletePaymentAction } from './actions';

export default function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    setIsDeleting(true);
    try {
      await deletePaymentAction(paymentId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment');
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="ml-4 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
      title="Delete Payment"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
