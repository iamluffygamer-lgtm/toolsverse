import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import AdSlot from '@/components/AdSlot'
import { ThemeProvider } from '@/components/ThemeProvider'
import CommandPalette from '@/components/CommandPalette'

const fontSans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})
const fontMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://toolstack.dev'),
  title: {
    default: 'ToolStack — 100+ Free Online Developer & Productivity Tools',
    template: '%s | ToolStack',
  },
  description:
    'ToolStack gives you 100+ free online tools — JSON formatter, Base64 encoder, Regex tester, SEO generators, and more. No sign-up. Instant results.',
  keywords: ['online tools', 'developer tools', 'JSON formatter', 'Base64 encoder', 'regex tester', 'SEO tools', 'free tools'],
  authors: [{ name: 'ToolStack' }],
  creator: 'ToolStack',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://toolstack.dev',
    siteName: 'ToolStack',
    title: 'ToolStack — 100+ Free Online Tools',
    description: 'The ultimate toolkit for developers, writers, and marketers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToolStack — 100+ Free Online Tools',
    description: 'The ultimate toolkit for developers, writers, and marketers.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <head>
        {/* Google AdSense — replace ca-pub-XXXXXXXXXXXXXXXX with your publisher ID */}
        {/* <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        /> */}
      </head>
      <body className="flex h-screen overflow-hidden bg-[--ts-bg] text-[--ts-ink-700]">
        <ThemeProvider>
          <noscript>
            <div className="p-4 bg-[--ts-error-bg] text-[--ts-error] text-center font-medium">
              ToolStack requires JavaScript to function properly. Please enable it.
            </div>
          </noscript>
          
          <CommandPalette />
          {/* ── Sidebar ─────────────────────────────────── */}
        <Sidebar />

        {/* ── Main content area ───────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />

          <div className="flex flex-1 overflow-hidden">
            {/* Page content */}
            <main className="flex-1 overflow-y-auto">
              {/* Top ad slot — leaderboard (728×90) */}
              <div className="max-w-[--content-max] mx-auto px-6 pt-4">
                <AdSlot size="leaderboard" id="top-banner" />
              </div>

              {/* Tool content */}
              <div className="max-w-[--content-max] mx-auto px-6 py-6">
                {children}
              </div>
            </main>

            {/* Right sidebar ad — skyscraper (160×600) */}
            <aside className="hidden xl:flex flex-col gap-4 w-[192px] px-3 py-6 border-l border-[--ts-border]">
              <AdSlot size="skyscraper" id="right-rail-1" />
              <AdSlot size="square" id="right-rail-2" />
            </aside>
          </div>
        </div>
        </ThemeProvider>
      </body>
    </html>
  )
}