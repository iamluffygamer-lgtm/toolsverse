'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { detectContentType, DetectionResult } from '@/lib/detectContent'
import { getToolById } from '@/lib/tools'
import { saveIncomingContent } from '@/lib/session'

export default function SmartPasteToast() {
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let timeout: NodeJS.Timeout

    const handlePaste = async (e: ClipboardEvent) => {
      // Ignore if pasting into input or textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const text = e.clipboardData?.getData('text')
      if (!text) return

      const result = detectContentType(text)
      if (result) {
        setDetection(result)
        setVisible(true)
        
        // Save content for when they click
        saveIncomingContent(text)

        // Auto-dismiss
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          setVisible(false)
        }, 5000)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
      clearTimeout(timeout)
    }
  }, [])

  if (!detection) return null

  const tool = getToolById(detection.toolId)
  if (!tool) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-[340px] w-full px-4"
      style={{
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="bg-[--ts-ink-900] text-[--ts-bg] rounded-xl p-3 shadow-2xl flex flex-col gap-2"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="opacity-80">🔍</span>
            {detection.label}
          </div>
          <button 
            onClick={() => setVisible(false)}
            className="text-[--ts-bg] opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
        
        <button
          onClick={() => {
            setVisible(false)
            router.push(`/tools/${tool.id}/`)
          }}
          className="text-left text-sm group"
        >
          <span className="text-[--ts-gold] group-hover:underline underline-offset-4 decoration-[--ts-gold]/50">
            Open in {tool.name} →
          </span>
        </button>
      </div>
    </div>
  )
}
