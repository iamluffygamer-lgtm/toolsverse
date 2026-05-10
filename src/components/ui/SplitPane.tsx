'use client'
import { ReactNode } from 'react'
import clsx from 'clsx'

interface PaneProps {
  label:    string              // pane header label e.g. "Input" / "Output"
  badge?:   ReactNode           // optional badge in header (size, line count etc)
  actions?: ReactNode           // optional action buttons in header (copy, etc)
  children: ReactNode           // pane content
  className?: string
}

interface SplitPaneProps {
  left:       PaneProps
  right:      PaneProps
  minHeight?: number            // default: 340
  className?: string
  // Future: onResize callback for draggable divider
}

export function Pane({
  label,
  badge,
  actions,
  children,
  className,
}: PaneProps) {
  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Pane header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
        <span className="text-xs font-semibold uppercase tracking-widest text-[--ts-ink-400]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {badge}
          {actions}
        </div>
      </div>
      {/* Pane content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}

export default function SplitPane({
  left,
  right,
  minHeight = 340,
  className,
}: SplitPaneProps) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 lg:grid-cols-2',
        className
      )}
      style={{ minHeight }}
    >
      {/* Left pane */}
      <Pane
        {...left}
        className="border-b lg:border-b-0 lg:border-r border-[--ts-border]"
      />
      {/* Right pane */}
      <Pane {...right} />
    </div>
  )
}
