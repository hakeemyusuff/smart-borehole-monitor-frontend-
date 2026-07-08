import { useEffect, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Logo } from "@/components/Logo"
import { AppSidebar } from "@/components/AppSidebar"
import { UserMenu } from "@/components/UserMenu"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes so tapping a nav
  // item never leaves the sheet hanging over the destination page.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="h-svh flex flex-col overflow-hidden">
      {/* Thin top bar — logo + user, status only, NOT primary nav. */}
      <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </Button>
          <Link
            to="/dashboard"
            aria-label="BoreSense home"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
          >
            <Logo size="md" />
          </Link>
        </div>
        <UserMenu />
      </header>

      <div className="flex-1 flex min-h-0 w-full">
        {/* Desktop sidebar — full-height column inside the fixed-height row.
            The parent locks height so no sticky trickery is needed. */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border h-full">
          <AppSidebar />
        </aside>

        {/* Mobile sidebar — Sheet drawer opened by the hamburger. */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="text-left">
                <Logo size="sm" />
              </SheetTitle>
            </SheetHeader>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main is now a bare full-height flex box. Individual pages decide
            whether to scroll (via PageShell) or lock (Dashboard). */}
        <main className="flex-1 min-w-0 min-h-0 flex overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M 3 5 h 12 M 3 9 h 12 M 3 13 h 12"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  )
}
