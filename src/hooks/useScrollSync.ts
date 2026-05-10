import { useRef, useCallback } from 'react'

interface UseScrollSyncOptions {
  // If true, syncing fires in both directions (A→B and B→A)
  // If false, only A→B
  bidirectional?: boolean
}

interface UseScrollSyncReturn {
  // Attach these refs to the two scrollable elements
  primaryRef:   React.RefObject<HTMLElement>
  secondaryRef: React.RefObject<HTMLElement>
  // Call this when primary scrolls
  onPrimaryScroll:   () => void
  // Call this when secondary scrolls (only used when bidirectional: true)
  onSecondaryScroll: () => void
}

export function useScrollSync(
  options: UseScrollSyncOptions = {}
): UseScrollSyncReturn {
  const { bidirectional = true } = options

  const primaryRef   = useRef<HTMLElement>(null)
  const secondaryRef = useRef<HTMLElement>(null)

  // Recursion guard — prevents A→B→A→B infinite loop
  const isSyncing = useRef(false)

  const syncFromTo = useCallback(
    (source: HTMLElement, target: HTMLElement) => {
      if (isSyncing.current) return
      isSyncing.current = true

      const sourceScrollable = source.scrollHeight - source.clientHeight
      if (sourceScrollable <= 0) {
        isSyncing.current = false
        return
      }

      const ratio = source.scrollTop / sourceScrollable
      const targetScrollable = target.scrollHeight - target.clientHeight
      target.scrollTop = ratio * targetScrollable

      // Release guard after browser paint
      requestAnimationFrame(() => {
        isSyncing.current = false
      })
    },
    []
  )

  const onPrimaryScroll = useCallback(() => {
    if (!primaryRef.current || !secondaryRef.current) return
    syncFromTo(primaryRef.current, secondaryRef.current)
  }, [syncFromTo])

  const onSecondaryScroll = useCallback(() => {
    if (!bidirectional) return
    if (!primaryRef.current || !secondaryRef.current) return
    syncFromTo(secondaryRef.current, primaryRef.current)
  }, [syncFromTo, bidirectional])

  return { primaryRef, secondaryRef, onPrimaryScroll, onSecondaryScroll }
}
