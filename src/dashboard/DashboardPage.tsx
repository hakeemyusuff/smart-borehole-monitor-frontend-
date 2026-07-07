import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardPage() {
  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Overview
        </p>
        <h1 className="text-5xl font-medium">Dashboard</h1>
      </header>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground max-w-prose">
            The dashboard — live borehole cylinder, pump status, and overview charts —
            arrives after the navigation and chart-control passes are approved.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
