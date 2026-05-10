import clsx from 'clsx'

interface StatsCardProps {
  label:      string
  value:      string | number
  sub?:       string          // optional subtext below value
  accent?:    'default' | 'gold' | 'success' | 'error' | 'warning'
  className?: string
}

export default function StatsCard({
  label,
  value,
  sub,
  accent = 'default',
  className,
}: StatsCardProps) {
  const accentColors = {
    default: 'text-[--ts-ink-900]',
    gold:    'text-[--ts-gold]',
    success: 'text-[--ts-success]',
    error:   'text-[--ts-error]',
    warning: 'text-[color:#C87A1A]',
  }

  return (
    <div className={clsx(
      'rounded-xl bg-[--ts-surface] border border-[--ts-border-soft] p-3',
      className
    )}>
      <p className={clsx('text-xl font-bold', accentColors[accent])}>
        {value}
      </p>
      <p className="text-xs text-[--ts-ink-500] mt-0.5">{label}</p>
      {sub && (
        <p className="text-[10px] text-[--ts-ink-400] mt-0.5">{sub}</p>
      )}
    </div>
  )
}
