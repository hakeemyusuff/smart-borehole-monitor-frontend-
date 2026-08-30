import { cn } from "@/lib/utils"

/**
 * Small ON/OFF toggle for binary state. Purely visual — the caller owns
 * the state and can defer the actual change (e.g. behind a confirmation
 * dialog) by not calling onCheckedChange until after confirmation.
 *
 * A11y: role="switch" + aria-checked so screen readers announce
 * "toggle, on/off". Keyboard-reachable via focus + Space/Enter.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  "aria-label": ariaLabel,
  className,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  "aria-label"?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        checked ? "bg-primary" : "bg-secondary border border-border",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-4 w-4 rounded-full shadow-sm transition-transform duration-200",
          checked
            ? "translate-x-6 bg-primary-foreground"
            : "translate-x-1 bg-muted-foreground",
        )}
      />
    </button>
  )
}
