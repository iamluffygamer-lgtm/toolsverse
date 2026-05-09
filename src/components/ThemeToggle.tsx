'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button className="btn-ghost p-2 w-9 h-9 rounded-full opacity-0" aria-hidden="true" />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="btn-ghost p-2 w-9 h-9 rounded-full relative overflow-hidden group flex items-center justify-center transition-transform active:scale-95"
      aria-label="Toggle dark mode"
    >
      <Sun 
        className={`w-4 h-4 absolute transition-all duration-300 ${isDark ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0 text-[--ts-ink-600] group-hover:text-[--ts-gold]'}`} 
      />
      <Moon 
        className={`w-4 h-4 absolute transition-all duration-300 ${isDark ? 'opacity-100 scale-100 rotate-0 text-[--ts-ink-600] group-hover:text-[--ts-gold]' : 'opacity-0 scale-50 -rotate-90'}`} 
      />
    </button>
  )
}
