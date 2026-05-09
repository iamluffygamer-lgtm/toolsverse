'use client'

import Link from 'next/link'
import type { Tool } from '@/lib/tools'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { hoverLift } from '@/lib/motion'
import { useState } from 'react'
import * as LucideIcons from 'lucide-react'

export default function ToolCard({ tool }: { tool: Tool }) {
  const [isHovered, setIsHovered] = useState(false)

  // Dynamically resolve icon from lucide-react if present, otherwise fallback
  const IconComponent = (LucideIcons as any)[tool.icon] || LucideIcons.Code

  const inner = (
    <motion.div
      variants={hoverLift}
      initial="rest"
      whileHover={!tool.comingSoon ? "hover" : "rest"}
      animate="rest"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={clsx(
        'group relative card',
        tool.comingSoon && 'opacity-60 cursor-not-allowed',
        tool.isFeatured && 'border-t-2 border-t-[--ts-gold]'
      )}
    >
      <AnimatePresence>
        {isHovered && !tool.comingSoon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: -4 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none hidden md:block"
          >
            <div className="bg-[--ts-ink-900] text-[--ts-bg] text-[11px] font-medium px-2.5 py-1 rounded shadow-xl whitespace-nowrap">
              Launch tool
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-[--ts-ink-900]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-1 z-10">
        {tool.isFeatured && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[--ts-gold-light] text-[--ts-gold] leading-none border border-[--ts-gold]/20">
            Trending 🔥
          </span>
        )}
        {tool.isNew && !tool.isFeatured && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[--ts-gold-light] text-[--ts-gold] leading-none">
            NEW
          </span>
        )}
        {tool.comingSoon && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[--ts-surface] text-[--ts-ink-400] leading-none border border-[--ts-border-soft]">
            SOON
          </span>
        )}
      </div>

      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-[--ts-surface] border border-[--ts-border-soft] flex items-center justify-center mb-3 group-hover:bg-[--ts-ink-900] group-hover:border-[--ts-ink-900] transition-colors">
        <IconComponent className="w-[18px] h-[18px] text-[--ts-ink-600] group-hover:text-[--ts-bg] transition-colors" />
      </div>

      {/* Text */}
      <h3 className="text-sm font-semibold text-[--ts-ink-900] mb-1 pr-16">{tool.name}</h3>
      <p className="text-xs text-[--ts-ink-500] leading-relaxed line-clamp-2">{tool.description}</p>
      
      {tool.isFeatured && tool.usageCount && (
        <p className="text-[10px] text-[--ts-ink-400] mt-2 font-medium">Used {tool.usageCount} times today</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {tool.tags.slice(0, 3).map(tag => (
          <span key={tag} className="badge">{tag}</span>
        ))}
      </div>
    </motion.div>
  )

  if (tool.comingSoon) return inner
  return <Link href={`/tools/${tool.id}/`} className="block outline-none focus-visible:ring-2 focus-visible:ring-[--ts-gold] rounded-xl">{inner}</Link>
}
