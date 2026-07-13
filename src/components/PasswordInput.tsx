import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Password field with an eye icon that toggles visibility. Same visual
 * footprint as a bare Input — the toggle sits inside the field's right
 * padding and stays out of the tab order for mice but is keyboard-
 * reachable so it works for both.
 */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)
  const label = visible ? "Hide password" : "Show password"
  const Icon = visible ? EyeOff : Eye
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:text-foreground transition-colors"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  )
}
