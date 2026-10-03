'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteProductAction } from './actions';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function ProductList({ productList }: { productList: any[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    productId: '',
    title: '',
    message: ''
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setModalConfig({
      isOpen: true,
      productId: id,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? All its qualities, sizes, and prices will be removed.'
    });
  };

  const confirmDelete = async () => {
    try {
      await deleteProductAction(modalConfig.productId);
      setModalConfig(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert("Failed to delete product: " + err.message);
    }
  };

  return (
    <div className="w-full space-y-6">
      {productList.map((product) => {
        const isExpanded = expandedId === product.id;
        
        // Group variants by Quality (Grade)
        const groupedByQuality = product.variants?.reduce((acc: any, v: any) => {
          const qName = v.grade?.name || 'Unknown';
          if (!acc[qName]) acc[qName] = [];
          acc[qName].push(v);
          return acc;
        }, {});

        return (
          <div 
            key={product.id} 
            className={`bg-white rounded-xl border transition-all duration-300 ease-in-out shadow-sm overflow-hidden ${
              isExpanded ? 'border-blue-400 shadow-lg ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            {/* Clickable Product Header */}
            <div 
              className={`flex justify-between items-center px-8 py-5 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-white'}`}
              onClick={() => toggleExpand(product.id)}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-5 transition-colors ${isExpanded ? 'bg-blue-600' : 'bg-slate-100'}`}>
                  <svg 
                    className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-white' : 'text-slate-500'}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800">{product.name}</h2>
                  <p className="text-base text-slate-500 font-medium mt-0.5">
                    {product.grades?.length || 0} Qualities &nbsp;•&nbsp; {product.sizes?.length || 0} Sizes
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link 
                  href={`/products/${product.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-5 py-2.5 text-base font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-black rounded-lg shadow-sm transition-all cursor-pointer inline-block"
                >
                  Edit Product
                </Link>
              </div>
            </div>

            {/* Expandable Details Area - Grid of Price Cards */}
            {isExpanded && (
              <div className="p-8 bg-slate-50 border-t border-blue-100 animate-fade-in-up">
                
                <div className="space-y-10">
                  {Object.entries(groupedByQuality || {}).map(([qualityName, variants]: [string, any]) => (
                    <div key={qualityName} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      
                      {/* Quality Heading */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-3"></span>
                          Quality: {qualityName}
                        </h3>
                        <button 
                          onClick={() => router.push(`/products/${product.id}`)}
                          className="px-4 py-2 text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                          Update Prices
                        </button>
                      </div>
                      
                      {/* Grid for Sizes & Prices */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {variants.map((v: any) => (
                          <div key={v.id} className="group bg-slate-50 border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between">
                            
                            <div className="flex justify-between items-start mb-4">
                              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Size</span>
                              <span className="text-lg font-black text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-sm">
                                {v.size?.label}
                              </span>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                              <div>
                                <div className="text-sm font-bold text-slate-500 mb-1">Rate</div>
                                <div className="text-2xl font-black text-emerald-600">
                                  {v.rate?.rate ? `Rs ${v.rate.rate}` : <span className="text-red-500 text-lg">Not Set</span>}
                                </div>
                              </div>
                              <div className="text-base font-bold text-slate-400 capitalize pb-1">
                                / {v.rate?.rate_unit || 'Unit'}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {(!product.variants || product.variants.length === 0) && (
                    <div className="text-center p-8 text-xl text-slate-500 font-medium">
                      No sizes or prices added yet.
                    </div>
                  )}
                </div>

              </div>
            )}
            
          </div>
        );
      })}

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={confirmDelete}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
