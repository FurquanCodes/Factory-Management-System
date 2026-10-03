'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/print.css';
import { saveInvoiceAction } from '../actions';

export default function InvoiceForm({ customers, inventory, nextInvoiceNo }: { customers: any[], inventory: any[], nextInvoiceNo: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerMode, setCustomerMode] = useState<'old' | 'new'>('old');
  const [filterCity, setFilterCity] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinCity, setWalkinCity] = useState<string>('');
  const [saveNewCustomer, setSaveNewCustomer] = useState<boolean>(false);
  const [dateStr, setDateStr] = useState<string>('');
  
  const [paymentStatus, setPaymentStatus] = useState<'due' | 'paid' | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'other'>('cash');

  // Initialize with a static ID for SSR, then generate a UUID on client side
  const [items, setItems] = useState<any[]>([{ id: 'default-ssr-id', productId: '', qualityId: '', sizeId: '', variantId: '', qty: 1, rate: 0, unit: '', amount: 0, productName: '', qualityName: '', sizeName: '' }]);

  useEffect(() => {
    // Generate real date and UUID only on the client
    const d = new Date();
    setDateStr(`${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
    setItems([{ id: crypto.randomUUID(), productId: '', qualityId: '', sizeId: '', variantId: '', qty: 1, rate: 0, unit: '', amount: 0, productName: '', qualityName: '', sizeName: '' }]);
  }, []);

  const addItem = () => setItems([...items, { id: crypto.randomUUID(), productId: '', qualityId: '', sizeId: '', variantId: '', qty: 1, rate: 0, unit: '', amount: 0, productName: '', qualityName: '', sizeName: '' }]);

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: any) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // --- Handlers for Dropdowns ---
  
  const handleProductChange = (id: string, productId: string) => {
    const product = inventory.find(p => p.id === productId);
    updateItem(id, {
      productId,
      productName: product?.name || '',
      qualityId: '', qualityName: '',
      sizeId: '', sizeName: '',
      variantId: '', rate: 0, unit: '', amount: 0
    });
  };

  const handleQualityChange = (id: string, item: any, qualityId: string) => {
    const product = inventory.find(p => p.id === item.productId);
    const quality = product?.grades.find((g: any) => g.id === qualityId);
    updateItem(id, {
      qualityId,
      qualityName: quality?.name || '',
      sizeId: '', sizeName: '',
      variantId: '', rate: 0, unit: '', amount: 0
    });
  };

  const handleSizeChange = (id: string, item: any, sizeId: string) => {
    const product = inventory.find(p => p.id === item.productId);
    const size = product?.sizes.find((s: any) => s.id === sizeId);
    
    // Find the matching variant (combination of product + quality + size)
    const variant = product?.variants.find((v: any) => v.grade_id === item.qualityId && v.size_id === sizeId);
    
    const rateVal = variant?.rate?.rate || 0;
    const unitVal = variant?.rate?.rate_unit || '';
    const amt = rateVal * item.qty;

    updateItem(id, {
      sizeId,
      sizeName: size?.label || '',
      variantId: variant?.id || '',
      rate: rateVal,
      unit: unitVal,
      amount: amt
    });
  };

  const handleQtyChange = (id: string, item: any, qtyStr: string) => {
    const qty = parseInt(qtyStr) || 0;
    const amt = item.rate * qty;
    updateItem(id, { qty, amount: amt });
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSave = (shouldPrint: boolean) => {
    const validItems = items.filter(i => i.variantId && i.qty > 0 && i.rate > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid item with a price.");
      return;
    }
    if (!selectedCustomer && (!walkinName || !walkinCity)) {
      alert("Please select a customer or type a new customer name and city.");
      return;
    }
    if (!paymentStatus) {
      alert("Please select a Payment Status (Due or Paid).");
      return;
    }

    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 50);
    }

    startTransition(async () => {
      try {
        const payload = {
          selectedCustomer,
          walkinName,
          walkinCity,
          saveNewCustomer,
          items: validItems,
          totalAmount,
          paymentStatus,
          paymentMethod,
          isFinal: shouldPrint
        };
        const result = await saveInvoiceAction(payload);
        if (result.success) {
          if (shouldPrint) {
            router.push('/invoices');
          } else {
            alert('Invoice saved successfully as Draft!');
            router.push('/invoices');
          }
        }
      } catch (err: any) {
        alert("Failed to save: " + err.message);
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedCustomer, walkinName, walkinCity, totalAmount, paymentStatus, paymentMethod, saveNewCustomer, customerMode]);
  
  // Get customer info for preview
  const custObj = customers.find(c => c.id === selectedCustomer);
  const custName = customerMode === 'old' && custObj ? custObj.name : (customerMode === 'new' && walkinName ? walkinName : '-');
  const custCity = customerMode === 'old' && custObj ? custObj.city : (customerMode === 'new' && walkinCity ? walkinCity : '-');

  return (
    <div className="w-full mx-auto pb-32">
      
      {/* ----------------- WEB APP FORM (Hidden when printing) ----------------- */}
      <div className="noprint max-w-6xl mx-auto space-y-6">
        
        {/* Customer Selection Box */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2 font-medium cursor-pointer text-slate-800 text-lg">
              <input 
                type="radio" 
                name="cm" 
                value="old" 
                className="w-5 h-5" 
                checked={customerMode === 'old'}
                onChange={() => setCustomerMode('old')}
              /> Existing customer
            </label>
            <label className="flex items-center gap-2 font-medium cursor-pointer text-slate-800 text-lg">
              <input 
                type="radio" 
                name="cm" 
                value="new" 
                className="w-5 h-5" 
                checked={customerMode === 'new'}
                onChange={() => {
                  setCustomerMode('new');
                  setSelectedCustomer(''); // Clear selected customer when switching to new
                }}
              /> New customer (type name)
            </label>
          </div>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">City</label>
              {customerMode === 'old' ? (
                <select 
                  className="w-full text-lg p-2 border border-slate-300 rounded focus:border-blue-500 outline-none bg-white"
                  value={filterCity}
                  onChange={(e) => {
                    setFilterCity(e.target.value);
                    setSelectedCustomer(''); // Reset customer selection if they change the city filter
                  }}
                >
                  <option value="">All Cities</option>
                  {Array.from(new Set(customers.map(c => c.city).filter(Boolean))).map(city => (
                    <option key={city as string} value={city as string}>{city}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  placeholder="Type City..."
                  className="w-full text-lg p-2 border border-slate-300 rounded focus:border-blue-500 outline-none" 
                  value={walkinCity}
                  onChange={(e) => setWalkinCity(e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Customer Name</label>
              {customerMode === 'old' ? (
                <select 
                  className="w-full text-lg p-2 border border-slate-300 rounded focus:border-blue-500 outline-none bg-white"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">Select customer</option>
                  {customers
                    .filter(c => filterCity ? c.city === filterCity : true)
                    .map(c => <option key={c.id} value={c.id}>{c.name} ({c.city})</option>)}
                </select>
              ) : (
                <div>
                  <input 
                    type="text" 
                    placeholder="Type Name..."
                    className="w-full text-lg p-2 border border-slate-300 rounded focus:border-blue-500 outline-none" 
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                  />
                  <div className="mt-2 flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600 hover:text-slate-800">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={saveNewCustomer}
                        onChange={(e) => setSaveNewCustomer(e.target.checked)}
                      />
                      Save to Customers List
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

        {/* Invoice Items Spreadsheet */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <label className="block text-lg font-bold text-slate-800 mb-4">Items</label>
          
          <div className="space-y-4">
            {items.map((item, index) => {
              
              // Get the selected product to populate dependent dropdowns
              const selProduct = inventory.find(p => p.id === item.productId);
              const availableQualities = selProduct?.grades || [];
              const availableSizes = selProduct?.sizes || [];

              return (
                <div key={item.id} className="p-4 border border-slate-200 rounded bg-slate-50 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-500 mb-1">Product</label>
                      <select 
                        className="w-full p-2 border border-slate-300 rounded bg-white text-lg font-medium"
                        value={item.productId}
                        onChange={(e) => handleProductChange(item.id, e.target.value)}
                      >
                        <option value="">-- Select Product --</option>
                        {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Quality</label>
                      <select 
                        className="w-full p-2 border border-slate-300 rounded bg-white text-lg"
                        value={item.qualityId}
                        onChange={(e) => handleQualityChange(item.id, item, e.target.value)}
                        disabled={!item.productId}
                      >
                        <option value="">-- Quality --</option>
                        {availableQualities.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Size</label>
                      <select 
                        className="w-full p-2 border border-slate-300 rounded bg-white text-lg"
                        value={item.sizeId}
                        onChange={(e) => handleSizeChange(item.id, item, e.target.value)}
                        disabled={!item.qualityId}
                      >
                        <option value="">-- Size --</option>
                        {availableSizes.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Quantity</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-lg" 
                        value={item.qty}
                        onChange={(e) => handleQtyChange(item.id, item, e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Unit</label>
                      <div className="w-full p-2 border border-slate-200 rounded bg-slate-200 font-bold text-slate-600 capitalize text-lg text-center cursor-not-allowed">
                        {item.unit || '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Rate</label>
                      <div className="w-full p-2 border border-slate-200 rounded bg-slate-100 font-bold text-slate-600 text-lg text-right">
                        {item.rate > 0 ? `Rs ${item.rate}` : '-'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <div className="text-xl font-black text-emerald-600">
                        {item.amount > 0 ? `Rs ${item.amount.toLocaleString()}` : '0.00'}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-white bg-white hover:bg-red-500 border border-red-200 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4">
            <button onClick={addItem} className="px-5 py-2.5 bg-white border-2 border-blue-200 text-blue-700 font-bold rounded-lg shadow-sm hover:bg-blue-50">+ Add Item Row</button>
          </div>
        </div>
        
        {/* Payment Status Block */}
        <div className="noprint bg-slate-50 border border-slate-200 p-6 rounded-lg mb-6">
          <label className="block text-lg font-bold text-slate-800 mb-4">Payment Status</label>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-lg font-medium text-slate-700">
              <input type="radio" name="ps" className="w-5 h-5" checked={paymentStatus === 'due'} onChange={() => setPaymentStatus('due')} /> Due (Udhaar)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-lg font-medium text-slate-700">
              <input type="radio" name="ps" className="w-5 h-5" checked={paymentStatus === 'paid'} onChange={() => setPaymentStatus('paid')} /> Paid Now
            </label>
            
            {paymentStatus === 'paid' && (
              <div className="ml-0 md:ml-8 flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                <label className="font-bold text-slate-500">Method:</label>
                <select className="p-2 border border-slate-300 rounded text-lg outline-none bg-white font-medium" value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="other">Cheque</option>
                </select>
              </div>
            )}
          </div>
          {paymentStatus === 'paid' && !selectedCustomer && (
            <p className="mt-3 text-sm text-amber-600 font-bold">* Note: Cash receipts are not tracked in the persistent ledger for walk-in (New) customers.</p>
          )}
        </div>
        
        <div className="flex justify-between items-center mb-10 border-t border-slate-200 pt-6">
          <button 
            onClick={() => handleSave(false)} 
            disabled={isPending}
            className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-xl rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save as Draft'}
          </button>
          <button 
            onClick={() => handleSave(true)} 
            disabled={isPending}
            className="px-8 py-3 bg-green-700 text-white font-bold text-xl rounded-lg shadow-lg flex items-center justify-center transition-transform hover:scale-105 hover:bg-green-800 disabled:opacity-50 disabled:scale-100"
          >
            {isPending ? 'Processing...' : 'Save & Print Invoice'}
          </button>
        </div>
        
      </div>


      {/* ----------------- EXACT A4 PRINT PAPER ----------------- */}
      <div className="paper relative" id="paper">
        
        {/* PAID/DUE Stamp Overlay */}
        {paymentStatus === 'paid' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ opacity: 0.08 }}>
            <div className="text-emerald-700 border-[10px] border-emerald-700 rounded-2xl px-16 py-6 font-black tracking-[0.2em] uppercase transform -rotate-45" style={{ fontSize: '120px', lineHeight: '1' }}>
              PAID
            </div>
          </div>
        )}
        {paymentStatus === 'due' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ opacity: 0.08 }}>
            <div className="text-blue-700 border-[10px] border-blue-700 rounded-2xl px-16 py-6 font-black tracking-[0.2em] uppercase transform -rotate-45" style={{ fontSize: '120px', lineHeight: '1' }}>
              DUE
            </div>
          </div>
        )}

        <div className="ph relative z-20">
          <div className="ph-left">
            <b>A One Sanitory Ware</b>
            <span>Hafizabad Road, Gujranwala</span>
          </div>
          <div className="ph-right">
            INVOICE
          </div>
        </div>
        
        <div className="meta">
          <div className="meta-col">
            <div className="meta-item"><span>Customer Name</span><b id="pc">{custName}</b></div>
            <div className="meta-item"><span>City</span><b id="py">{custCity}</b></div>
          </div>
          <div className="meta-col">
            <div className="meta-item"><span>Invoice No</span><b id="pn">{nextInvoiceNo}</b></div>
            <div className="meta-item"><span>Invoice Date</span><b id="pd">{dateStr}</b></div>
          </div>
        </div>
        
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th style={{width: "44px"}}>Sr</th>
                <th>Description of Goods</th>
                <th className="r">Qty</th>
                <th className="r">Price</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody id="pb">
              {items.map((item, i) => {
                // Build the description exactly like the reference: "U Clump 1/2 (Heavy)"
                const hasDesc = item.productName && item.sizeName && item.qualityName;
                const desc = hasDesc ? `${item.productName} ${item.sizeName} (${item.qualityName})` : '';

                return (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td>{desc || ''}</td>
                    <td className="r">{item.qty && item.unit ? `${item.qty} ${item.unit}` : ''}</td>
                    <td className="r">{item.rate ? `Rs ${item.rate} / ${item.unit}` : ''}</td>
                    <td className="r">{item.amount ? item.amount.toFixed(2) : ''}</td>
                  </tr>
                );
              })}
              {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tot">
                <td colSpan={4} className="r">Total Amount</td>
                <td className="r" id="pt">{totalAmount > 0 ? totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="thanks">Thank you for your business</div>
      </div>
      
    </div>
  );
}
