'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/app/components/BackButton'
import { addCustomerAction } from '../actions'

export default function AddCustomerPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    try {
      const result = await addCustomerAction(formData)
      if (result.id) {
        router.push('/customers')
      }
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <BackButton />
          <h1 className="text-3xl font-black text-slate-800">Add New Customer</h1>
          <p className="text-lg text-slate-500 mt-1 font-medium">Create a new customer or dealer account in the Khata system.</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-1">Customer / Dealer Name *</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                required 
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g. F.G. Traders"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-bold text-slate-700 mb-1">City</label>
                <input 
                  type="text" 
                  id="city" 
                  name="city" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g. Peshawar"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="0300-1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="block text-sm font-bold text-slate-700 mb-1">Account Type</label>
                <select 
                  id="type" 
                  name="type" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="customer">Regular Customer</option>
                  <option value="dealer">Dealer</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="opening_balance" className="block text-sm font-bold text-slate-700 mb-1">Opening Balance (Rs)</label>
                <input 
                  type="number" 
                  id="opening_balance" 
                  name="opening_balance" 
                  defaultValue="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">If they already owe money, enter it here.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => router.back()}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-md hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center"
              >
                {isSubmitting ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
