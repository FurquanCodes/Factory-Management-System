'use client'

import { useRouter } from 'next/navigation'

export default function SalesFilter({ currentFilter }: { currentFilter: string }) {
  const router = useRouter()

  return (
    <select
      value={currentFilter}
      onChange={(e) => router.push(`/dashboard?filter=${e.target.value}`)}
      className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded outline-none border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
    >
      <option value="today">Today</option>
      <option value="7days">Last 7 Days</option>
      <option value="30days">Last 30 Days</option>
    </select>
  )
}
