'use client'

import { useState } from 'react'
import { deleteInvoiceAction } from './actions'

export default function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteInvoiceAction(invoiceId)
      setIsOpen(false)
    } catch (error: any) {
      alert("Failed to delete invoice: " + error.message)
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-red-600 hover:text-red-800 font-bold px-3 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors inline-block"
      >
        Delete
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Delete Invoice?</h3>
              </div>
              <p className="text-slate-600 ml-14">
                Are you sure you want to completely delete this invoice? This action cannot be undone and will also delete any payment associated with it.
              </p>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
