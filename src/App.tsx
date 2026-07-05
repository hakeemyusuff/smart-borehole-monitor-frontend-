import { Button } from "@/components/ui/button"

function App() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">BoreSense</h1>
      <p className="text-muted-foreground">
        Tailwind + shadcn chain works if this button is styled.
      </p>
      <Button>Test button</Button>
    </main>
  )
}

export default App
