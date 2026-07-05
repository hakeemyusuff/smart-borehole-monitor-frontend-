import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"

export function HomePage() {
  const { logout } = useAuth()

  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Welcome to BoreSense</h1>
        <p className="text-muted-foreground mt-2">
          You're signed in. Location, borehole and sensor management arrive in the next step.
        </p>
      </div>
      <Button variant="outline" onClick={logout}>
        Sign out
      </Button>
    </main>
  )
}
