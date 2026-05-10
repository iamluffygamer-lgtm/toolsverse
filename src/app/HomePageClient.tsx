'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, staggerContainer } from '@/lib/motion'
import ToolCard from '@/components/ToolCard'
import AdSlot from '@/components/AdSlot'
import { TOOLS, CATEGORIES, type ToolCategory } from '@/lib/tools'
import clsx from 'clsx'

const STATS = [
  { label: 'Free Tools',        value: 100, suffix: '+' },
  { label: 'Daily Users',       value: 12400, suffix: '+' },
  { label: 'Requests Today',    value: 48000, suffix: '+' },
  { label: 'Categories',        value: 6, suffix: '' },
]

function useCountUp(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted) {
        setHasStarted(true)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return
    let start = 0
    const end = target
    if (start === end) return
    let totalMilSecDur = duration
    let incrementTime = (totalMilSecDur / end) * 2
    if (incrementTime < 10) incrementTime = 16
    const steps = Math.ceil(totalMilSecDur / incrementTime)
    const stepValue = end / steps
    
    let current = 0
    const timer = setInterval(() => {
      current += stepValue
      if (current >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, incrementTime)
    return () => clearInterval(timer)
  }, [target, duration, hasStarted])

  return { count, ref }
}

import StatsCard from '@/components/ui/StatsCard'

function StatCard({ stat }: { stat: typeof STATS[0] }) {
  const { count, ref } = useCountUp(stat.value, 1500)
  return (
    <div ref={ref} className="h-full">
      <StatsCard 
        label={stat.label}
        value={`${count.toLocaleString()}${stat.suffix}`}
        className="h-full flex flex-col items-center justify-center !bg-transparent !border-none p-4"
      />
    </div>
  )
}

export default function HomePageClient() {
  const [activeTab, setActiveTab] = useState<ToolCategory | 'all'>('all')
  const totalTools = TOOLS.length

  const featuredTools = TOOLS.filter(t => t.isFeatured)
  
  const displayCategories = activeTab === 'all' 
    ? CATEGORIES 
    : CATEGORIES.filter(c => c.id === activeTab)

  return (
    <div className="relative pb-16">
      {/* Noise Texture */}
      <div 
        className="pointer-events-none absolute inset-x-0 -top-10 h-[500px] opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 -top-20 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(200,151,62,0.12),transparent)]" />

      {/* Hero */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative pt-6 mb-16 text-center flex flex-col items-center"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[--ts-gold-light] text-[--ts-gold] text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[--ts-gold] animate-pulse" />
          {totalTools}+ tools · 100% free · No sign-up
        </motion.div>
        
        <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-bold text-[--ts-ink-900] tracking-tight mb-5 leading-[1.1]">
          Every tool you need,<br />
          <span className="text-[--ts-gold]" style={{ filter: 'drop-shadow(0 0 24px rgba(200,151,62,0.3))' }}>in one place.</span>
        </motion.h1>
        
        <motion.p variants={fadeUp} className="text-lg text-[--ts-ink-500] max-w-lg mx-auto">
          ToolStack gives developers, writers, and marketers instant access to
          {' '}{totalTools}+ free online tools. No ads interrupting your flow. Just tools.
        </motion.p>
      </motion.div>

      {/* Live Stats */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mb-16 border-y border-[--ts-border-soft] bg-[--ts-surface]/30 backdrop-blur-sm relative z-10"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[--ts-border-soft] max-w-4xl mx-auto">
          {STATS.map((stat, i) => (
            <motion.div key={stat.label} variants={fadeUp} custom={i}>
              <StatCard stat={stat} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Featured Tools */}
      {featuredTools.length > 0 && activeTab === 'all' && (
        <section className="mb-16 relative z-10">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-semibold text-[--ts-ink-900]">Featured Tools</h2>
          </div>
          <motion.div 
            variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {featuredTools.map((tool, i) => (
              <motion.div key={tool.id} variants={fadeUp} custom={i}>
                <ToolCard tool={tool} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Category Tabs */}
      <div className="mb-8 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 hide-scrollbar relative z-10">
        <div className="flex items-center gap-2 w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              "relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === 'all' ? "text-[--ts-bg]" : "text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]"
            )}
          >
            {activeTab === 'all' && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-[--ts-ink-900] rounded-full -z-10" />
            )}
            All Tools
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={clsx(
                "relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === cat.id ? "text-[--ts-bg]" : "text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]"
              )}
            >
              {activeTab === cat.id && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-[--ts-ink-900] rounded-full -z-10" />
              )}
              {cat.label.replace(/ Tools| & .*/, '')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10"
        >
          {displayCategories.map((cat, i) => {
            const tools = TOOLS.filter(t => t.category === cat.id && !t.isFeatured)
            if (!tools.length) return null
            return (
              <section key={cat.id} className="mb-12">
                <div className="flex items-center gap-3 mb-5 px-1">
                  <h2 className="text-base font-semibold text-[--ts-ink-900]">{cat.label}</h2>
                  <span className="text-[10px] uppercase font-bold text-[--ts-ink-400] bg-[--ts-surface] px-1.5 py-0.5 rounded">{tools.length} tools</span>
                  <div className="flex-1 border-t border-[--ts-border-soft]" />
                </div>
                
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tools.map((tool, j) => (
                    <motion.div key={tool.id} variants={fadeUp} custom={j}>
                      <ToolCard tool={tool} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
