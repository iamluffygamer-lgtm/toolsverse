'use client'
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'
import { SearchX } from 'lucide-react'

export default function EmptyState({ message = "No tools found" }: { message?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-[--ts-surface] border border-[--ts-border-soft] flex items-center justify-center mb-4 text-[--ts-ink-400]">
        <SearchX className="w-8 h-8 opacity-50" />
      </div>
      <h3 className="text-lg font-semibold text-[--ts-ink-900] mb-2">{message}</h3>
      <p className="text-sm text-[--ts-ink-500] max-w-sm">Try adjusting your search or browse our categories to find what you're looking for.</p>
    </motion.div>
  )
}
