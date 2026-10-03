'use client';

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-bold text-lg rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
      type="button"
    >
      Print Report
    </button>
  );
}
