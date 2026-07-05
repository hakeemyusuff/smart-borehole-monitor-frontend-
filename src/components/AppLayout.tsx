import { Link, Outlet } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"

export function AppLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-svh flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" aria-label="BoreSense home" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md">
          <Logo size="md" />
        </Link>
        <Button variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 md:py-12">
        <Outlet />
      </main>
    </div>
  )
}
