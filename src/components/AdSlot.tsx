'use client'

type AdSize = 'leaderboard' | 'skyscraper' | 'square' | 'banner' | 'rectangle'

interface AdSlotProps {
  size: AdSize
  id: string
  className?: string
}

const AD_DIMENSIONS: Record<AdSize, { w: number; h: number; label: string }> = {
  leaderboard: { w: 728, h: 90,  label: '728 × 90' },
  skyscraper:  { w: 160, h: 600, label: '160 × 600' },
  square:      { w: 250, h: 250, label: '250 × 250' },
  banner:      { w: 468, h: 60,  label: '468 × 60' },
  rectangle:   { w: 300, h: 250, label: '300 × 250' },
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS:
// 1. Replace the placeholder div below with your actual AdSense <ins> tag.
// 2. Uncomment the useEffect to call (adsbygoogle = []).push({}) on mount.
// 3. Remove the placeholder div.
//
// Example AdSense tag:
// <ins
//   className="adsbygoogle"
//   style={{ display: 'block' }}
//   data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
//   data-ad-slot="XXXXXXXXXX"
//   data-ad-format="auto"
//   data-full-width-responsive="true"
// />
// ─────────────────────────────────────────────────────────────────────────────

export default function AdSlot({ size, id, className = '' }: AdSlotProps) {
  const dim = AD_DIMENSIONS[size]

  // Uncomment when AdSense is live:
  // useEffect(() => {
  //   try { (window.adsbygoogle = window.adsbygoogle || []).push({}) }
  //   catch (e) {}
  // }, [])

  // TEMPORARILY DISABLED: Remove `return null` when you are ready to show ads/placeholders again.
  return null;

  return (
    <div
      id={`ad-${id}`}
      className={`ad-slot ${className}`}
      style={{ width: '100%', maxWidth: dim.w, height: dim.h }}
      aria-label="Advertisement"
      role="complementary"
    >
      {/* Remove this placeholder once AdSense is active */}
      <span style={{ fontSize: 11, letterSpacing: '0.05em', color: 'var(--ts-ink-400)' }}>
        AD · {dim.label}
      </span>
    </div>
  )
}
