import { useAuth } from "@/auth/useAuth"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"

export function HomePage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-svh flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Logo size="md" />
        <Button variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-4xl">Welcome to BoreSense</h1>
        <p className="text-muted-foreground max-w-md">
          You're signed in. Location, borehole and sensor management arrive in the next step.
        </p>
      </main>
    </div>
  )
}
