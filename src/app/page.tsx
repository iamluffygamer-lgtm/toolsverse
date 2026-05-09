import type { Metadata } from 'next'
import { TOOLS, CATEGORIES, getToolsByCategory } from '@/lib/tools'
import ToolCard from '@/components/ToolCard'
import AdSlot from '@/components/AdSlot'

export const metadata: Metadata = {
  title: 'ToolStack — 100+ Free Online Developer & Productivity Tools',
  description: 'Browse 100+ free tools for developers, writers, and marketers. No sign-up required.',
}

import HomePageClient from './HomePageClient'

export default function HomePage() {
  return <HomePageClient />
}
