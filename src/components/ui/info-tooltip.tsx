import { Tooltip as RadixTooltip } from "radix-ui"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Subtle ⓘ button that reveals explanatory text on hover/focus/tap.
 * Used to keep long model/methodology notes OUT of the visible layout —
 * the note lives in the tooltip, the UI stays quiet.
 *
 * Radix Tooltip needs a provider; we ship it inside the component so call
 * sites stay one-liners. Touch devices toggle on tap; Escape closes.
 */
export function InfoTooltip({
  note,
  title,
  className,
}: {
  /** The long-form explanation that used to be a visible paragraph. */
  note: string
  /** Optional bold lead-in inside the bubble (e.g. "Paired MAE"). */
  title?: string
  className?: string
}) {
  return (
    <RadixTooltip.Provider delayDuration={150}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <button
            type="button"
            aria-label={title ? `About ${title}` : "More information"}
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full",
              "text-muted-foreground/70 hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              className,
            )}
          >
            <Info className="size-3.5" aria-hidden />
          </button>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side="top"
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              "z-50 max-w-72 rounded-lg border border-border bg-popover px-3 py-2",
              "text-xs leading-relaxed text-popover-foreground",
              "shadow-lg shadow-black/40",
              "animate-in fade-in-0 zoom-in-95",
            )}
          >
            {title && (
              <p className="mb-1 font-medium text-foreground">{title}</p>
            )}
            {note}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
