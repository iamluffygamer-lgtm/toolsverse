'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { searchTools, TOOLS } from '@/lib/tools'
import { Search, ArrowRight, Sun, Moon, Grid } from 'lucide-react'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentTools, setRecentTools] = useState<string[]>([])
  
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
      const stored = localStorage.getItem('ts-recent-tools')
      if (stored) setRecentTools(JSON.parse(stored))
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [open])

  const results = query.trim() ? searchTools(query).slice(0, 5) : []
  
  const recentToolItems = recentTools
    .map(id => TOOLS.find(t => t.id === id))
    .filter(Boolean)
    .slice(0, 3)

  const hasRecent = !query.trim() && recentToolItems.length > 0

  const items = query.trim() 
    ? results.map(t => ({ type: 'tool', ...t }))
    : [
        ...(hasRecent ? recentToolItems.map(t => ({ type: 'tool', ...t })) : []),
        { id: 'action-all', type: 'action', name: 'Go to All Tools', icon: 'grid' },
        { id: 'action-theme', type: 'action', name: 'Toggle Dark Mode', icon: 'theme' }
      ]

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleSelect = (item: any) => {
    if (item.type === 'tool') {
      const newRecent = [item.id, ...recentTools.filter(id => id !== item.id)].slice(0, 5)
      setRecentTools(newRecent)
      localStorage.setItem('ts-recent-tools', JSON.stringify(newRecent))
      setOpen(false)
      router.push(`/tools/${item.id}`)
    } else if (item.id === 'action-all') {
      setOpen(false)
      router.push('/tools/')
    } else if (item.id === 'action-theme') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
      setOpen(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + items.length) % items.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[activeIndex]) {
        handleSelect(items[activeIndex])
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-[--ts-card-bg] border border-[--ts-border] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
          >
            {/* Input */}
            <div className="flex items-center px-4 border-b border-[--ts-border]">
              <Search className="w-5 h-5 text-[--ts-ink-400]" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tools, actions..."
                className="w-full bg-transparent px-3 py-4 text-lg text-[--ts-ink-900] placeholder-[--ts-ink-400] focus:outline-none"
              />
              <div className="px-1.5 py-0.5 text-xs text-[--ts-ink-400] bg-[--ts-surface] rounded border border-[--ts-border-soft]">
                ESC
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!query.trim() && (
                <div className="px-3 pb-2 pt-1">
                  {hasRecent && <div className="text-xs font-semibold text-[--ts-ink-400] uppercase tracking-wider mb-2">Recent</div>}
                  {hasRecent && items.filter(i => i.type === 'tool').map((item, i) => (
                    <ResultRow
                      key={item.id}
                      item={item}
                      active={i === activeIndex}
                      onSelect={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(i)}
                    />
                  ))}
                  <div className="text-xs font-semibold text-[--ts-ink-400] uppercase tracking-wider mt-4 mb-2">Quick Actions</div>
                  {items.filter(i => i.type === 'action').map((item, i) => {
                    const offset = items.findIndex(x => x.id === item.id)
                    return (
                      <ResultRow
                        key={item.id}
                        item={item}
                        active={offset === activeIndex}
                        onSelect={() => handleSelect(item)}
                        onMouseEnter={() => setActiveIndex(offset)}
                      />
                    )
                  })}
                </div>
              )}

              {query.trim() && items.length > 0 && (
                <div className="px-3 pb-2 pt-1">
                  <div className="text-xs font-semibold text-[--ts-ink-400] uppercase tracking-wider mb-2">Tools</div>
                  {items.map((item, i) => (
                    <ResultRow
                      key={item.id}
                      item={item}
                      active={i === activeIndex}
                      onSelect={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(i)}
                    />
                  ))}
                </div>
              )}

              {query.trim() && items.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-[--ts-ink-500]">No results found for "{query}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[--ts-border] bg-[--ts-surface] px-4 py-3 flex items-center justify-center gap-6 text-xs text-[--ts-ink-500]">
              <div className="flex items-center gap-1.5"><kbd className="font-sans px-1 bg-[--ts-card-bg] border border-[--ts-border-soft] rounded">↑↓</kbd> navigate</div>
              <div className="flex items-center gap-1.5"><kbd className="font-sans px-1 bg-[--ts-card-bg] border border-[--ts-border-soft] rounded">↵</kbd> open</div>
              <div className="flex items-center gap-1.5"><kbd className="font-sans px-1 bg-[--ts-card-bg] border border-[--ts-border-soft] rounded">esc</kbd> close</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function ResultRow({ item, active, onSelect, onMouseEnter }: { item: any, active: boolean, onSelect: () => void, onMouseEnter: () => void }) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-[--ts-surface]' : 'hover:bg-[--ts-surface]/50'}`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-md bg-[--ts-card-bg] shadow-xs border border-[--ts-border-soft] flex-shrink-0 ${active ? 'text-[--ts-gold]' : 'text-[--ts-ink-500]'}`}>
        {item.icon === 'grid' && <Grid className="w-4 h-4" />}
        {item.icon === 'theme' && <Moon className="w-4 h-4" />}
        {item.type === 'tool' && <span className="w-4 h-4 block bg-current mask-icon" style={{ WebkitMaskImage: `url('https://api.iconify.design/lucide/${item.icon.toLowerCase()}.svg')`, maskImage: `url('https://api.iconify.design/lucide/${item.icon.toLowerCase()}.svg')` }} />}
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <p className={`text-sm font-medium truncate ${active ? 'text-[--ts-ink-900]' : 'text-[--ts-ink-700]'}`}>{item.name}</p>
        {item.category && <p className="text-xs text-[--ts-ink-400] capitalize">{item.category}</p>}
      </div>
      {active && (
        <ArrowRight className="w-4 h-4 text-[--ts-ink-400] flex-shrink-0" />
      )}
      {active && <div className="absolute left-2 w-0.5 h-6 bg-[--ts-gold] rounded-full" />}
    </div>
  )
}
