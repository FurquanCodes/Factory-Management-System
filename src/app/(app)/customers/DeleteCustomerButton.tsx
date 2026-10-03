'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCustomerAction } from './actions';

export default function DeleteCustomerButton({ customerId, customerName }: { customerId: string, customerName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${customerName}?\nThis will hide the customer from lists, but their past records will remain intact.`)) return;
    setIsDeleting(true);
    try {
      await deleteCustomerAction(customerId);
      router.push('/customers');
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-6 py-3 bg-white border-2 border-red-100 text-red-600 font-bold text-lg rounded-lg shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 flex items-center"
      title="Delete Customer"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}
