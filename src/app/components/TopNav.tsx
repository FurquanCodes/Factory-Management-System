'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setIsOpen(false);

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/customers', label: 'Customers' },
    { href: '/products', label: 'Products' },
    { href: '/invoices/new', label: 'New Invoice' },
    { href: '/invoices', label: 'Invoice History' },
    { href: '/outstanding', label: 'Outstanding' },
    { href: '/recycle-bin', label: 'Recycle Bin' },
  ];

  return (
    <header className="noprint relative z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-6 h-16">
        
        {/* Left Side: Brand and Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-black text-xl text-blue-700 tracking-tight hover:text-blue-800 transition-colors">
            A One Sanitory
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 font-bold text-slate-500">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`hover:text-blue-600 transition-colors ${pathname === link.href ? 'text-blue-600' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side: Actions and Mobile Toggle */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/payments/new" className="hidden sm:inline-block text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded font-bold text-sm transition-colors">
            + Record Payment
          </Link>
          <span className="hidden md:inline-block text-sm cursor-pointer hover:underline text-slate-500 font-medium">Eng | اردو</span>
          <button className="hidden sm:inline-block text-red-500 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded font-bold text-sm transition-colors">
            Logout
          </button>
          
          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-blue-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Sidebar Menu */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <span className="font-black text-xl text-blue-700 tracking-tight">Menu</span>
          <button onClick={closeMenu} className="text-slate-400 hover:text-slate-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-2 px-4 font-bold text-slate-600">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={closeMenu}
                className={`px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors ${pathname === link.href ? 'text-blue-600 bg-blue-50' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            
            <div className="h-px bg-slate-200 my-4" />
            
            <Link 
              href="/payments/new" 
              onClick={closeMenu}
              className="px-4 py-3 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              + Record Payment
            </Link>
            <button className="text-left px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
