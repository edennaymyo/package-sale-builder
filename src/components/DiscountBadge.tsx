import { cn, formatCurrency, formatPercent } from '@/lib/utils'

type DiscountMotion = 'shine' | 'wiggle' | 'both'

interface DiscountBadgeProps {
  amount: number
  percent: number
  motion?: DiscountMotion
  compact?: boolean
  className?: string
}

export function DiscountBadge({
  amount,
  percent,
  motion = 'shine',
  compact = false,
  className,
}: DiscountBadgeProps) {
  if (amount <= 0) return null

  return (
    <div
      className={cn(
        'discount-badge inline-flex max-w-full items-center gap-2 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 shadow-sm',
        (motion === 'shine' || motion === 'both') && 'discount-badge--shine',
        (motion === 'wiggle' || motion === 'both') && 'discount-badge--wiggle',
        compact ? 'text-sm' : 'text-base',
        className
      )}
    >
      <span className="discount-badge__icon flex-shrink-0" aria-hidden="true">
        💸
      </span>
      <span className="min-w-0">
        <span className="font-extrabold tracking-normal">
          {formatCurrency(amount)} ကျပ် သက်သာ
        </span>
        <span className="ml-1 whitespace-nowrap text-xs font-semibold text-emerald-700/80">
          ({formatPercent(percent)})
        </span>
      </span>
    </div>
  )
}
