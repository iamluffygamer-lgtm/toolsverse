'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CATEGORIES, TOOLS, type ToolCategory } from '@/lib/tools'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Command } from 'lucide-react'

const CategoryIcon = ({ id }: { id: ToolCategory }) => {
  const icons: Record<ToolCategory, React.ReactNode> = {
    developer: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    text:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,
    seo:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    image:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    math:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>,
    misc:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  }
  return <span className="flex-shrink-0">{icons[id]}</span>
}

export default function Sidebar() {
  const pathname = usePathname()
  const [openCat, setOpenCat] = useState<ToolCategory | null>('developer')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Listen for mobile toggle event
  useEffect(() => {
    const handleToggle = () => setMobileOpen(o => !o)
    window.addEventListener('toggle-mobile-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle)
  }, [])

  // Mount animation for badges
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen?.(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          "fixed md:relative flex flex-col w-[--sidebar-width] bg-[--ts-sidebar] border-r border-[--ts-border] overflow-y-auto flex-shrink-0 z-50 transition-transform duration-300 ease-[--ease-out-expo]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ height: '100vh' }}
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={() => setMobileOpen?.(false)}
          className="flex items-center gap-2 px-4 h-[--topbar-height] border-b border-[--ts-border] flex-shrink-0 group hover:bg-[--ts-surface]/50 transition-colors"
        >
          <motion.span 
            whileHover={{ scale: 1.05 }}
            className="w-6 h-6 rounded-md bg-[--ts-ink-900] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" fill="var(--ts-bg)" rx="0.5"/>
              <rect x="7" y="1" width="4" height="4" fill="var(--ts-bg)" rx="0.5"/>
              <rect x="1" y="7" width="4" height="4" fill="var(--ts-gold)" rx="0.5"/>
              <rect x="7" y="7" width="4" height="4" fill="var(--ts-bg)" rx="0.5"/>
            </svg>
          </motion.span>
          <span className="text-base font-semibold text-[--ts-ink-900] tracking-tight group-hover:scale-[1.02] transition-transform origin-left">
            Tool<span className="text-[--ts-gold]">Stack</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2">
          {/* Home */}
          <Link
            href="/"
            onClick={() => setMobileOpen?.(false)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 transition-all',
              pathname === '/'
                ? 'bg-[--ts-surface] text-[--ts-ink-900] font-medium shadow-xs'
                : 'text-[--ts-ink-600] hover:bg-[--ts-surface]/50 hover:text-[--ts-ink-900]'
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            All Tools
          </Link>

          <div className="my-2 mx-2 border-t border-[--ts-border-soft]" />

          {/* Categories */}
          {CATEGORIES.map(cat => {
            const tools = TOOLS.filter(t => t.category === cat.id)
            const isOpen = openCat === cat.id
            const hasActive = tools.some(t => pathname === `/tools/${t.id}/`)

            return (
              <div key={cat.id} className="mb-0.5">
                {/* Category header */}
                <button
                  onClick={() => setOpenCat(isOpen ? null : cat.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    hasActive
                      ? 'text-[--ts-ink-900] font-medium'
                      : 'text-[--ts-ink-600] hover:bg-[--ts-surface]/50 hover:text-[--ts-ink-900]'
                  )}
                >
                  <CategoryIcon id={cat.id} />
                  <span className="flex-1">{cat.label}</span>
                  <span className={clsx("text-[--ts-ink-400] text-xs transition-opacity duration-500", mounted ? 'opacity-100' : 'opacity-0')}>
                    {tools.length}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={clsx('flex-shrink-0 transition-transform duration-300 ease-[--ease-out-expo]', isOpen && 'rotate-180')}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Tool list */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 pl-2.5 border-l border-[--ts-border-soft] mt-0.5 mb-1 flex flex-col gap-0.5">
                        {tools.map(tool => {
                          const isActive = pathname === `/tools/${tool.id}/`
                          return (
                            <Link
                              key={tool.id}
                              onClick={() => setMobileOpen?.(false)}
                              href={tool.comingSoon ? '#' : `/tools/${tool.id}/`}
                              className={clsx(
                                'flex items-center gap-2 px-2 py-1.5 rounded-r-md text-[13px] transition-all border-l-2',
                                isActive
                                  ? 'bg-[--ts-surface] text-[--ts-ink-900] font-medium border-[--ts-gold]'
                                  : tool.comingSoon
                                  ? 'text-[--ts-ink-400] cursor-not-allowed border-transparent'
                                  : 'text-[--ts-ink-600] border-transparent hover:bg-[--ts-surface]/50 hover:text-[--ts-ink-900] hover:border-[--ts-gold]'
                              )}
                            >
                              <span className="flex-1 truncate">{tool.name}</span>
                              {tool.isNew && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[--ts-gold-light] text-[--ts-gold] leading-none">
                                  NEW
                                </span>
                              )}
                              {tool.comingSoon && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[--ts-surface] text-[--ts-ink-400] leading-none border border-[--ts-border-soft]">
                                  SOON
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>

        {/* Cmd+K Hint */}
        <div className="px-4 py-2">
          <button 
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[--ts-ink-500] bg-[--ts-surface]/50 hover:bg-[--ts-surface] rounded-lg border border-[--ts-border-soft] transition-colors"
          >
            <span className="flex items-center gap-1.5"><Command className="w-3.5 h-3.5"/> Command Menu</span>
            <kbd className="font-sans px-1.5 py-0.5 bg-[--ts-card-bg] border border-[--ts-border] rounded shadow-xs text-[10px]">⌘K</kbd>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[--ts-border]">
          <p className="text-[11px] text-[--ts-ink-400] text-center">
            © 2026 ToolStack
          </p>
        </div>
      </aside>
    </>
  )
}
