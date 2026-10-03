'use client';

import { useState } from 'react';
import { recoverCustomerAction, recoverInvoiceAction } from './actions';
import { useRouter } from 'next/navigation';

export function RecoverCustomerButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleRecover = async () => {
    setIsPending(true);
    try {
      await recoverCustomerAction(id);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button 
      onClick={handleRecover}
      disabled={isPending}
      className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      {isPending ? 'Recovering...' : 'Recover'}
    </button>
  );
}

export function RecoverInvoiceButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleRecover = async () => {
    setIsPending(true);
    try {
      await recoverInvoiceAction(id);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button 
      onClick={handleRecover}
      disabled={isPending}
      className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      {isPending ? 'Recovering...' : 'Recover'}
    </button>
  );
}
