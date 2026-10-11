'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomerBfAction } from './actions'

interface EditBfModalProps {
  customerId: string
  customerName: string
  currentBf: number
  currentDate?: string | null
  compact?: boolean
}

export default function EditBfModal({
  customerId,
  customerName,
  currentBf,
  currentDate,
  compact = false
}: EditBfModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Format today's date (YYYY-MM-DD)
  const getTodayDate = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  // Format current local time (HH:MM)
  const getNowTime = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${mins}`
  }

  const [bfAmount, setBfAmount] = useState<string>(currentBf.toString())
  const [bfDate, setBfDate] = useState<string>(getTodayDate())
  const [bfTime, setBfTime] = useState<string>(getNowTime())

  const handleOpen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setBfAmount(currentBf.toString())
    
    // If customer already had a created_at date, initialize with that date/time if valid, else today
    if (currentDate) {
      try {
        const d = new Date(currentDate)
        if (!isNaN(d.getTime())) {
          setBfDate(d.toISOString().split('T')[0])
          const hours = String(d.getHours()).padStart(2, '0')
          const mins = String(d.getMinutes()).padStart(2, '0')
          setBfTime(`${hours}:${mins}`)
        } else {
          setBfDate(getTodayDate())
          setBfTime(getNowTime())
        }
      } catch {
        setBfDate(getTodayDate())
        setBfTime(getNowTime())
      }
    } else {
      setBfDate(getTodayDate())
      setBfTime(getNowTime())
    }

    setError(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isSubmitting) return
    setIsOpen(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(bfAmount)
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid amount (e.g. 0 or 25000)')
      return
    }

    // Combine date and time into ISO timestamp
    let combinedTimestamp: string | undefined = undefined
    if (bfDate) {
      const timePart = bfTime || '12:00'
      const combined = new Date(`${bfDate}T${timePart}:00`)
      if (!isNaN(combined.getTime())) {
        combinedTimestamp = combined.toISOString()
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateCustomerBfAction({
        customerId,
        opening_balance: parsed,
        createdAt: combinedTimestamp
      })
      setIsOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update BF amount')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={handleOpen}
          className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold rounded-md transition-colors cursor-pointer"
          title="Edit Brought Forward (BF)"
        >
          <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit BF
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          title="Edit Brought Forward / Opening Balance"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Edit BF
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in text-left">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Edit BF</h3>
                <p className="text-xs text-amber-100 mt-0.5">{customerName}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-amber-800/50 transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              {/* BF Amount */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  BF Amount (Rs) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm pointer-events-none">
                    Rs
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bfAmount}
                    onChange={(e) => setBfAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    autoFocus
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-900 font-bold text-lg"
                  />
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    BF Date (تاریخ)
                  </label>
                  <input
                    type="date"
                    value={bfDate}
                    onChange={(e) => setBfDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800 text-sm font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default: Today</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Time (وقت)
                  </label>
                  <input
                    type="time"
                    value={bfTime}
                    onChange={(e) => setBfTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800 text-sm font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default: Current time</p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-lg shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save BF'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
