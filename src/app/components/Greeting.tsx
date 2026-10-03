'use client'

import { useEffect, useState } from 'react'

export default function Greeting() {
  const [greeting, setGreeting] = useState('Welcome')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    setDateStr(now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }))
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight">{greeting}! 👋</h1>
      {dateStr && <p className="text-blue-200 text-lg mt-1 font-medium">{dateStr}</p>}
    </div>
  )
}
