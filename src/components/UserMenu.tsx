import { useMemo } from "react"
import { useAuth } from "@/auth/useAuth"
import { decodeIdentityFromToken } from "@/lib/auth-token"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const { token, logout } = useAuth()

  const identity = useMemo(() => {
    if (!token) return null
    return decodeIdentityFromToken(token)
  }, [token])

  const displayName =
    (identity?.first_name && identity?.last_name
      ? `${identity.first_name} ${identity.last_name}`
      : identity?.email) ?? "Signed in"
  const initials = getInitials(identity, displayName)
  const subline = identity?.email && displayName !== identity.email ? identity.email : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 border border-border hover:border-primary/40 hover:bg-muted/40 transition-[background-color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <span className="grid place-items-center size-7 rounded-full bg-primary/15 text-primary text-xs font-medium [font-variant-numeric:tabular-nums]">
            {initials}
          </span>
          <span className="text-sm text-foreground max-w-[10rem] truncate">
            {displayName}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground truncate">{displayName}</span>
          {subline && (
            <span className="text-xs text-muted-foreground truncate">{subline}</span>
          )}
          <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Signed in
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(
  id: ReturnType<typeof decodeIdentityFromToken>,
  fallbackText: string,
): string {
  if (id?.first_name && id?.last_name) {
    return `${id.first_name[0]}${id.last_name[0]}`.toUpperCase()
  }
  if (id?.email) return id.email[0].toUpperCase()
  return fallbackText[0].toUpperCase()
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M 4 6 L 8 10 L 12 6"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
