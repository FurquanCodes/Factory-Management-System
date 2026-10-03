'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/app/components/BackButton'
import { addProductAction } from '../actions'

export default function AddProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string

    if (!name) {
      setError("Product Name is required")
      setIsSubmitting(false)
      return;
    }

    try {
      const { success, id } = await addProductAction(formData)
      if (success) {
        router.push(`/products/${id}`)
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
          <h1 className="text-3xl font-black text-slate-800">Add New Product</h1>
          <p className="text-lg text-slate-500 mt-1 font-medium">Create a new product group in the inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-500 mb-2">Product Name *</label>
            <input 
              name="name"
              type="text"
              required
              autoFocus
              className="w-full text-lg p-3 border border-slate-300 rounded focus:border-blue-500 outline-none"
              placeholder="e.g. U Clump"
            />
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 font-bold rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create & Add Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
