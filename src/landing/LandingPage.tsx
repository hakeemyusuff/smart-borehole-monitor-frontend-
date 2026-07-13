import { Link } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { BoreholeCylinder } from "@/dashboard/BoreholeCylinder"
import { WaterLevelChart } from "@/readings/WaterLevelChart"
import { FlowChart } from "@/readings/FlowChart"
import type { ChartPoint } from "@/lib/types"

export function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-svh flex flex-col bg-background text-foreground overflow-x-clip">
      <TopBar isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <Hero isAuthenticated={isAuthenticated} />
        <Pillars />
      </main>
      <LandingFooter />
    </div>
  )
}

function TopBar({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="w-full border-b border-border/60 bg-background/70 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      <div className="lg:col-span-7 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <p className="text-xs uppercase tracking-[0.22em] text-primary/90">
          Groundwater · Real-time
        </p>
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-foreground">
          See what your boreholes are doing,{" "}
          <span className="text-primary">live.</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
          BoreSense turns pressure and flow sensors into a real-time view of
          every borehole in your field. Watch water levels rise and fall,
          catch pump events as they happen, and never guess again.
        </p>
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          {isAuthenticated ? (
            <Button asChild size="lg">
              <Link to="/dashboard">Open dashboard →</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/register">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">I have an account</Link>
              </Button>
            </>
          )}
        </div>
        <p className="inline-flex items-center gap-2 pt-4">
          <span
            className="size-1.5 rounded-full bg-primary animate-pulse"
            aria-hidden
          />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            System online · Streaming from field sites
          </span>
        </p>
      </div>

      <div className="lg:col-span-5 h-80 md:h-96 lg:h-[420px] flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
        <BoreholeCylinder
          totalDepth={50}
          criticalLow={10}
          optimalHigh={45}
          currentLevel={32}
        />
      </div>
    </section>
  )
}

function Pillars() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pb-20 md:pb-28 flex flex-col gap-14 md:gap-20">
      <div className="flex flex-col gap-3 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Three pillars
        </p>
        <h2 className="font-heading text-2xl md:text-3xl leading-tight">
          A dashboard, honest charts, and the raw feed — all in one place.
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FeatureCard
          eyebrow="Live dashboard"
          title="Water level at a glance"
          body="One glance shows the latest reading, aquifer thresholds, and pump status for every borehole in the selected field."
          media={
            <div className="h-64 flex items-center justify-center">
              <BoreholeCylinder
                totalDepth={50}
                criticalLow={10}
                optimalHigh={45}
                currentLevel={28}
              />
            </div>
          }
        />

        <FeatureCard
          eyebrow="Time-scale charts"
          title="Points at their actual timestamps"
          body="30-minute idle windows spread wide, pumping drawdowns look steep. Reference lines mark your critical and optimal levels so anomalies read at a glance."
          media={
            <div className="h-64 w-full">
              <WaterLevelChart
                points={sampleWaterLevel()}
                range="day"
                criticalLow={10}
                optimalHigh={45}
              />
            </div>
          }
        />

        <FeatureCard
          eyebrow="Raw transmissions"
          title="Every reading, unedited"
          body="Every value the sensors send, timestamped and unaggregated. The honest counterpart to the charts — useful for audits, debugging, and trust."
          media={
            <div className="h-64 overflow-hidden rounded-lg border border-border/60 bg-card/50">
              <RawFeedSnippet />
            </div>
          }
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Also
          </p>
          <h3 className="font-heading text-xl md:text-2xl">
            Flow readings that show gaps, not fictions.
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Between pumping bursts the sensor is silent. Rather than
            connecting the dots and inventing a signal, BoreSense breaks the
            line where the data breaks — so the shape of the chart matches
            the shape of reality.
          </p>
        </div>
        <div className="h-56 w-full">
          <FlowChart points={sampleFlow()} range="day" />
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  eyebrow,
  title,
  body,
  media,
}: {
  eyebrow: string
  title: string
  body: string
  media: React.ReactNode
}) {
  return (
    <div className="group/card rounded-2xl border border-border/60 bg-card/40 p-6 flex flex-col gap-5 transition-colors hover:border-primary/40">
      {media}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary/90">
          {eyebrow}
        </p>
        <h3 className="font-heading text-lg leading-snug">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  )
}

function RawFeedSnippet() {
  const rows = [
    { t: "08:49:00", v: "8.497" },
    { t: "08:48:30", v: "8.350" },
    { t: "08:48:00", v: "8.349" },
    { t: "08:47:30", v: "8.329" },
    { t: "08:47:00", v: "8.394" },
    { t: "08:46:30", v: "8.549" },
    { t: "08:46:00", v: "8.946" },
    { t: "08:45:30", v: "9.414" },
  ]
  return (
    <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
      <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-[0.14em]">
        <tr>
          <th className="text-left px-3 py-2 font-medium">Timestamp</th>
          <th className="text-right px-3 py-2 font-medium">Water level (m)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.t}
            className="border-t border-border/60 hover:bg-secondary/20"
          >
            <td className="text-left px-3 py-1.5 text-foreground">{r.t}</td>
            <td className="text-right px-3 py-1.5 text-foreground">{r.v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-border/60 mt-4">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
          BoreSense · v1.0.0-beta
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Groundwater monitoring · Field-ready
        </p>
      </div>
    </footer>
  )
}

// Hand-crafted mock data that mimics the real "quiet-then-drawdown-then-
// recovery" shape a pressure transducer produces. Uses today's midnight as
// the anchor so the chart's tick formatter renders meaningful times.
function sampleWaterLevel(): ChartPoint[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const t = (h: number) =>
    new Date(base.getTime() + h * 60 * 60 * 1000).toISOString()
  return [
    { t: t(0), value: 44.8 },
    { t: t(1), value: 44.6 },
    { t: t(2), value: 44.5 },
    { t: t(3), value: 44.7 },
    { t: t(4), value: 44.9 },
    { t: t(5.9), value: 44.9 },
    { t: t(6.0), value: 40.1 },
    { t: t(6.1), value: 32.5 },
    { t: t(6.2), value: 22.4 },
    { t: t(6.3), value: 14.2 },
    { t: t(6.5), value: 12.1 },
    { t: t(7), value: 18.6 },
    { t: t(8), value: 27.4 },
    { t: t(9), value: 33.5 },
    { t: t(10), value: 38.9 },
    { t: t(11), value: 42.6 },
    { t: t(12), value: 44.4 },
    { t: t(13.9), value: 44.7 },
    { t: t(14.0), value: 39.2 },
    { t: t(14.1), value: 30.4 },
    { t: t(14.2), value: 20.7 },
    { t: t(14.3), value: 13.9 },
    { t: t(14.5), value: 11.8 },
    { t: t(15), value: 17.2 },
    { t: t(16), value: 26.3 },
    { t: t(17), value: 33.0 },
    { t: t(18), value: 38.4 },
    { t: t(19), value: 42.1 },
    { t: t(20), value: 44.0 },
    { t: t(21), value: 44.6 },
    { t: t(22), value: 44.8 },
    { t: t(23), value: 44.9 },
  ]
}

// Two pumping bursts with a wide idle window in between. FlowChart's own
// gap-injection will draw a break across the idle window.
function sampleFlow(): ChartPoint[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const t = (h: number) =>
    new Date(base.getTime() + h * 60 * 60 * 1000).toISOString()
  const cluster = (start: number, count: number, min = 13.5, max = 16.4) =>
    Array.from({ length: count }, (_, i) => ({
      t: t(start + i * 0.008),
      value: min + Math.random() * (max - min),
    }))
  return [
    ...cluster(6.0, 15),
    ...cluster(14.0, 15),
  ]
}
