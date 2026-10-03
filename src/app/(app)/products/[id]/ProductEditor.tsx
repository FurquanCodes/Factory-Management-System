'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addQualityAction, addSizeAction, setRatesAction, deleteQualityAction, deleteSizeAction, deleteProductAction } from '../actions'

export default function ProductEditor({ product, qualities, sizes, variants, rates }: any) {
  const router = useRouter()
  const [newQuality, setNewQuality] = useState('')
  const [newSize, setNewSize] = useState('')
  
  // Local state for rates
  const [localRates, setLocalRates] = useState<Record<string, { rate: string, unit: string }>>(() => {
    const map: Record<string, any> = {}
    variants.forEach((v: any) => {
      const existing = rates.find((r: any) => r.variant_id === v.id)
      map[v.id] = {
        rate: existing ? existing.rate.toString() : '',
        unit: existing ? existing.rate_unit : 'dozen'
      }
    })
    return map
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const handleAddQuality = async () => {
    if (!newQuality) return
    await addQualityAction(product.id, newQuality)
    setNewQuality('')
  }

  const handleAddSize = async () => {
    if (!newSize) return
    await addSizeAction(product.id, newSize)
    setNewSize('')
  }

  const handleDeleteQuality = async (id: string) => {
    if (!window.confirm("Are you sure? This will remove all prices associated with this quality.")) return;
    await deleteQualityAction(product.id, id)
  }

  const handleDeleteSize = async (id: string) => {
    if (!window.confirm("Are you sure? This will remove all prices associated with this size.")) return;
    await deleteSizeAction(product.id, id)
  }

  const handleDeleteProduct = async () => {
    if (!window.confirm("Are you SURE you want to delete this entire product? This will remove all its qualities, sizes, and prices.")) return;
    setIsSaving(true);
    try {
      await deleteProductAction(product.id);
      router.push('/products');
    } catch (e: any) {
      alert("Failed to delete product: " + e.message);
      setIsSaving(false);
    }
  }

  const handleSavePrices = async () => {
    setIsSaving(true)
    setSaveMessage('')
    const payload = []
    
    for (const v of variants) {
      const lr = localRates[v.id]
      if (lr && lr.rate !== '') {
        payload.push({
          variant_id: v.id,
          rate: Number(lr.rate),
          rate_unit: lr.unit
        })
      }
    }

    try {
      await setRatesAction(payload)
      setSaveMessage('Prices saved successfully! New invoices will use these prices.')
    } catch (e: any) {
      setSaveMessage('Failed to save prices: ' + e.message)
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Qualities Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-800 mb-4">Qualities (Grades)</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {qualities.length === 0 && <span className="text-slate-400 text-sm">No qualities added yet.</span>}
            {qualities.map((q: any) => (
              <span key={q.id} className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-sm rounded border border-blue-100">
                {q.name}
                <button 
                  onClick={() => handleDeleteQuality(q.id)}
                  className="ml-2 text-blue-400 hover:text-red-500 transition-colors"
                  title="Delete Quality"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Common, Medium, Heavy" 
              value={newQuality}
              onChange={e => setNewQuality(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
            />
            <button 
              onClick={handleAddQuality}
              disabled={!newQuality}
              className="px-4 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* Sizes Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-800 mb-4">Sizes</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {sizes.length === 0 && <span className="text-slate-400 text-sm">No sizes added yet.</span>}
            {sizes.map((s: any) => (
              <span key={s.id} className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded border border-emerald-100">
                {s.label}
                <button 
                  onClick={() => handleDeleteSize(s.id)}
                  className="ml-2 text-emerald-400 hover:text-red-500 transition-colors"
                  title="Delete Size"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. 1/2, 3/4, 1*1/2" 
              value={newSize}
              onChange={e => setNewSize(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none"
            />
            <button 
              onClick={handleAddSize}
              disabled={!newSize}
              className="px-4 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

      </div>

      {/* Prices Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">Prices Setup</h2>
            <p className="text-sm text-slate-500 mt-1">Set the price and selling unit (Dozen or Piece) for each combination.</p>
          </div>
          <button 
            onClick={handleSavePrices}
            disabled={isSaving || variants.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Prices'}
          </button>
        </div>

        {saveMessage && (
          <div className={`mb-6 p-3 rounded font-bold ${saveMessage.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {saveMessage}
          </div>
        )}

        {variants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium border border-dashed border-slate-300 rounded-lg bg-slate-50">
            Please add at least one Quality and one Size above to generate variants for pricing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="p-3 border border-slate-200 font-bold">Quality</th>
                  <th className="p-3 border border-slate-200 font-bold">Size</th>
                  <th className="p-3 border border-slate-200 font-bold w-48">Price (Rs)</th>
                  <th className="p-3 border border-slate-200 font-bold w-48">Unit</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-3 border border-slate-200 font-bold text-slate-800">{v.grades?.name}</td>
                    <td className="p-3 border border-slate-200 font-bold text-slate-800">{v.sizes?.label}</td>
                    <td className="p-3 border border-slate-200">
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="Not set"
                        value={localRates[v.id]?.rate || ''}
                        onChange={(e) => setLocalRates(prev => ({ ...prev, [v.id]: { ...prev[v.id], rate: e.target.value } }))}
                        className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none font-bold text-slate-700"
                      />
                    </td>
                    <td className="p-3 border border-slate-200">
                      <select
                        value={localRates[v.id]?.unit || 'dozen'}
                        onChange={(e) => setLocalRates(prev => ({ ...prev, [v.id]: { ...prev[v.id], unit: e.target.value } }))}
                        className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none font-medium text-slate-700 bg-white"
                      >
                        <option value="dozen">Per Dozen</option>
                        <option value="piece">Per Piece</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl border border-red-100 p-6 mt-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-red-800">Danger Zone</h2>
            <p className="text-sm text-red-600 mt-1">Delete this product and all its qualities, sizes, and prices.</p>
          </div>
          <button 
            onClick={handleDeleteProduct}
            disabled={isSaving}
            className="px-6 py-2.5 bg-white text-red-700 font-bold border border-red-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
          >
            Delete Product
          </button>
        </div>
      </div>
    </div>
  )
}
