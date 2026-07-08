import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon, prefixes: ["/dashboard"] },
  {
    to: "/locations",
    label: "Locations",
    icon: LocationsIcon,
    // The drill-down through boreholes and sensors is nested under
    // Locations conceptually, so keep the nav item lit for those routes too.
    prefixes: ["/locations", "/boreholes"],
  },
  { to: "/data-logs", label: "Data logs", icon: DataLogsIcon, prefixes: ["/data-logs"] },
]

const APP_VERSION = "v1.0.0-beta"

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()

  return (
    <div className="flex flex-col h-full">
      <nav className="flex flex-col gap-1 p-3">
        <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.prefixes.some((p) =>
            p === "/dashboard"
              ? location.pathname === p
              : location.pathname.startsWith(p),
          )
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group/nav flex items-center gap-3.5 px-3 py-2 rounded-lg text-sm transition-[background-color,color] duration-150 outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon active={isActive} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-border flex flex-col gap-1.5">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span
            className="size-1.5 rounded-full bg-primary animate-pulse"
            aria-hidden
          />
          System online
        </p>
        <p className="text-[10px] text-muted-foreground/70 [font-variant-numeric:tabular-nums]">
          BoreSense {APP_VERSION}
        </p>
      </div>
    </div>
  )
}

function DashboardIcon({ active }: { active: boolean }) {
  const stroke = active ? "var(--primary)" : "currentColor"
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect x={2} y={2} width={5} height={7} rx={1} stroke={stroke} strokeWidth={1.3} />
      <rect x={2} y={11} width={5} height={3} rx={1} stroke={stroke} strokeWidth={1.3} />
      <rect x={9} y={2} width={5} height={3} rx={1} stroke={stroke} strokeWidth={1.3} />
      <rect x={9} y={7} width={5} height={7} rx={1} stroke={stroke} strokeWidth={1.3} />
    </svg>
  )
}

function DataLogsIcon({ active }: { active: boolean }) {
  const stroke = active ? "var(--primary)" : "currentColor"
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x={2}
        y={2.5}
        width={12}
        height={11}
        rx={1.5}
        stroke={stroke}
        strokeWidth={1.3}
      />
      <path d="M 2 6.5 L 14 6.5" stroke={stroke} strokeWidth={1.3} />
      <path d="M 6 6.5 L 6 13.5" stroke={stroke} strokeWidth={1.3} />
    </svg>
  )
}

function LocationsIcon({ active }: { active: boolean }) {
  const stroke = active ? "var(--primary)" : "currentColor"
  const fill = active ? "var(--primary)" : "transparent"
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x={4}
        y={1.5}
        width={8}
        height={13}
        rx={2}
        stroke={stroke}
        strokeWidth={1.3}
      />
      <path
        d="M 4 8.5 L 4 12.5 A 2 2 0 0 0 6 14.5 L 10 14.5 A 2 2 0 0 0 12 12.5 L 12 8.5 Z"
        fill={fill}
        fillOpacity={0.85}
      />
    </svg>
  )
}
