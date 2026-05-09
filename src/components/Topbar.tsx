'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchTools } from '@/lib/tools'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function Topbar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ReturnType<typeof searchTools>>([])
  const [focused, setFocused] = useState(false)
  const router = useRouter()

  function onSearch(q: string) {
    setQuery(q)
    setResults(q.trim().length > 1 ? searchTools(q).slice(0, 8) : [])
  }

  function onSelect(id: string) {
    setQuery(''); setResults([]); setFocused(false)
    router.push(`/tools/${id}/`)
  }

  return (
    <header className="flex items-center gap-4 px-6 h-[--topbar-height] border-b border-[--ts-border] bg-[--ts-bg]/90 backdrop-blur-sm flex-shrink-0 relative z-40 transition-colors">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
        className="md:hidden btn-ghost p-1.5 -ml-2 rounded-md text-[--ts-ink-600] hover:text-[--ts-ink-900]"
        aria-label="Toggle Sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <div className="relative group cursor-pointer" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[--ts-ink-400] transition-colors group-hover:text-[--ts-ink-600]"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div
            className="w-full flex items-center justify-between pl-8 pr-2 py-1.5 h-9 text-sm rounded-md shadow-[0_0_0_1px_var(--ts-border)] bg-white/80 dark:bg-[--ts-surface]/80 backdrop-blur-sm text-[--ts-ink-400] transition-all focus-within:ring-2 focus-within:ring-[--ts-gold]/40 hover:bg-white dark:hover:bg-[--ts-surface]"
          >
            <span>Search 100+ tools...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[--ts-surface] border border-[--ts-border-soft] text-[--ts-ink-500]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Dropdown results (Deprecated in favor of Command Palette, keeping temporarily) */}
        {focused && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[--ts-border] rounded-xl shadow-lg overflow-hidden z-50">
            {results.map(t => (
              <button
                key={t.id}
                onMouseDown={() => onSelect(t.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-[--ts-surface] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[--ts-ink-900] truncate">{t.name}</p>
                  <p className="text-xs text-[--ts-ink-500] truncate">{t.description}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[--ts-surface] text-[--ts-ink-400] border border-[--ts-border-soft] capitalize flex-shrink-0">
                  {t.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <nav className="flex items-center gap-2">
        <ThemeToggle />
        <Link href="/tools/" className="btn-ghost text-sm px-3 py-1.5 rounded-lg">
          All Tools
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost px-2.5 py-1.5 rounded-lg"
          aria-label="GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[--ts-ink-600]">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"/>
          </svg>
        </a>
      </nav>
    </header>
  )
}
