'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button 
      onClick={() => router.back()} 
      className="text-blue-600 font-bold hover:underline mb-2 inline-block cursor-pointer flex items-center gap-1 bg-transparent border-none p-0"
    >
      &larr; Back
    </button>
  )
}
