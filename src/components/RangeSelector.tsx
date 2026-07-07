import type { ChartRange } from "@/lib/types"
import { cn } from "@/lib/utils"

const OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

export function RangeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ChartRange
  onChange: (v: ChartRange) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Chart range"
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card p-0.5",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors duration-150 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
