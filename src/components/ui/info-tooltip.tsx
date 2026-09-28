import { Popover } from "radix-ui"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

/** Click/tap/keyboard-accessible explanation. Escape closes it. */
export function InfoTooltip({ note, title, className }: {
  note: string; title?: string; className?: string
}) {
  return <Popover.Root><Popover.Trigger asChild>
    <button type="button" aria-label={title ? `About ${title}` : "More information"}
      className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}>
      <Info className="size-3.5" aria-hidden/>
    </button>
  </Popover.Trigger><Popover.Portal><Popover.Content side="top" align="end" sideOffset={6} collisionPadding={12}
    className="z-50 max-w-72 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg">
    {title && <p className="mb-1 font-medium">{title}</p>}{note}
  </Popover.Content></Popover.Portal></Popover.Root>
}
