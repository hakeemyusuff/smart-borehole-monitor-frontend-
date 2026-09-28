import { useEffect, useState } from "react"
import { ChevronDown, Download, RefreshCw, Waves } from "lucide-react"
import { Accordion as RadixAccordion } from "radix-ui"
import { usePredictionChart, usePredictionStatus } from "./queries"
import { useReadingsPage } from "@/data-logs/queries"
import { PredictionChart } from "./PredictionChart"
import { BoreholeCylinder } from "@/dashboard/BoreholeCylinder"
import { RangeSelector } from "@/components/RangeSelector"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatWat, closestForecastForReading, downloadCsv } from "@/readings/chart-data"
import { cn } from "@/lib/utils"
import type { Borehole, ChartRange, SensorPublic } from "@/lib/types"

export function ForecastPanel({ borehole, sensor }: { borehole: Borehole; sensor?: SensorPublic }) {
  const [range, setRange] = useState<ChartRange>("day")
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 10_000); return () => window.clearInterval(timer) }, [])
  const statusQuery = usePredictionStatus(borehole.id ?? undefined)
  const chartQuery = usePredictionChart(borehole.id ?? undefined, range)
  const latestQuery = useReadingsPage("water-level", borehole.id ?? undefined, sensor?.id, 0, 1)
  const status = statusQuery.data
  const latest = latestQuery.data?.items[0]
  const level = latest?.water_level ?? status?.current_level ?? null
  const captured = latest?.captured_at ?? status?.current_level_captured_at ?? null
  const captureTime = captured ? Date.parse(captured) : NaN
  const measuredStale = !Number.isFinite(captureTime) || captureTime > now || now - captureTime > 35 * 60_000 || latestQuery.isError
  const points = chartQuery.data ?? []
  const historyCurrent = !chartQuery.isError && chartQuery.dataUpdatedAt > 0 && now - chartQuery.dataUpdatedAt < 120_000
  const matched = historyCurrent && !measuredStale
    ? closestForecastForReading(points, captured, now, status?.model_version ?? null)
    : null
  const predicted = matched?.predicted ?? null
  const pairs = points.filter(p => p.predicted !== null && p.actual !== null)
  const mae = pairs.length ? pairs.reduce((sum,p) => sum + Math.abs(p.predicted! - p.actual!), 0) / pairs.length * 100 : null
  const scale = Math.max(borehole.total_depth || 0, Math.ceil(level ?? 0), Math.ceil(predicted ?? 0), 1)
  const forecastMessage = chartQuery.isError ? "Forecast history unreachable."
    : chartQuery.isPending || statusQuery.isPending ? "Checking forecast history…"
    : measuredStale ? "Waiting for a recent sensor reading."
    : !historyCurrent ? "Refreshing forecast history…"
    : "No saved forecast matches this reading yet."
  const exportHistory = () => downloadCsv(`forecast-${borehole.id}-${range}.csv`,
    ["target_time_utc", "issued_at_utc", "predicted_level_m", "actual_level_m", "model_version"],
    points.map(p => [p.t, p.issued_at, p.predicted, p.actual, p.model_version]))

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card min-w-0" aria-label="Current vs forecast level">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <h2 className="text-xl md:text-2xl font-heading">Current vs Forecast Level</h2>
        <Button variant="outline" size="sm" onClick={() => { void statusQuery.refetch(); void chartQuery.refetch(); void latestQuery.refetch() }} disabled={statusQuery.isFetching || chartQuery.isFetching}><RefreshCw className="size-3.5 mr-2"/>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)] items-start min-w-0">
        {/* Cylinders */}
        <div className="flex flex-col p-4 md:p-5 border-b xl:border-b-0 xl:border-r border-border bg-gradient-to-b from-primary/5 to-transparent min-w-0">
          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="flex flex-col justify-between h-full p-4 min-w-0 text-center rounded-xl border border-primary/20 bg-background/40" data-testid="measured-column">
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xs font-medium text-primary">Measured</p>
                  <InfoTooltip title="Measured level" note="Most recent sensor reading, in metres above the fixed pressure sensor. Shown on the same scale as the forecast column." />
                </div>
                <p className="text-2xl md:text-3xl tabular-nums mt-3">{level !== null ? level.toFixed(3) : "—"}<span className="text-sm text-muted-foreground ml-1">m</span></p>
              </div>
              <div className="flex-1 flex items-center justify-center my-3">
                <div className="h-48 md:h-60 w-full">
                  <BoreholeCylinder totalDepth={scale} currentLevel={level} isPending={latestQuery.isPending && level === null} criticalLow={borehole.critical_low_level} optimalHigh={borehole.optimal_high_level}/>
                </div>
              </div>
              <div className="min-h-12">
                <Badge variant="outline" className={cn(measuredStale ? "border-warning/40 text-warning" : "border-primary/40 text-primary")}>
                  {latestQuery.isError ? "Connection issue" : measuredStale ? "Stale reading" : "Live"}
                </Badge>
                <p className="text-[11px] text-muted-foreground mt-1.5">{formatWat(captured)}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between h-full p-4 min-w-0 text-center rounded-xl border border-[#c084fc]/25 bg-[#c084fc]/5" data-testid="forecast-column" aria-live="polite">
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xs font-medium text-[#c084fc]">Forecast for reading</p>
                  <InfoTooltip title="Forecast for this reading" note="The saved two-hour forecast with a target closest to the latest measurement (within 35 minutes), issued before that measurement. New forecasts are generated every 30 minutes." />
                </div>
                <p className="text-2xl md:text-3xl tabular-nums mt-3">{predicted !== null ? predicted.toFixed(3) : "—"}<span className="text-sm text-muted-foreground ml-1">m</span></p>
              </div>
              <div className="flex-1 flex items-center justify-center my-3">
                <div className="h-48 md:h-60 w-full">
                  {predicted !== null
                    ? <BoreholeCylinder totalDepth={scale} currentLevel={predicted} variant="forecast" isPending={statusQuery.isPending} criticalLow={borehole.critical_low_level} optimalHigh={borehole.optimal_high_level}/>
                    : <ForecastEmptyState message={forecastMessage} />}
                </div>
              </div>
              <div className="min-h-12">
                <Badge variant="outline" className={predicted !== null ? "border-[#c084fc]/40 text-[#c084fc]" : "border-warning/40 text-warning"}>
                  {chartQuery.isError ? "Connection issue" : chartQuery.isPending || statusQuery.isPending ? "Checking" : predicted !== null ? "Matched forecast" : "Awaiting match"}
                </Badge>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {matched ? `For ${formatWat(matched.t)}` : "Awaiting forecast"}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* History chart + stats */}
        <div className="p-4 md:p-5 min-w-0">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading text-lg">Forecast history</h3>                <InfoTooltip title="Forecast history" note="Forecast target times (violet, dashed) against observed levels (teal, solid, with point markers). Grey dashed bridges mark interpolated gaps; the Y axis zooms to the data." />
            </div>
            <RangeSelector value={range} onChange={setRange}/>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground" aria-label="Chart legend">
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-[#2dd4bf]"/>Observed</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#c084fc]"/>Forecast</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-[#64748b]"/>Estimated gap bridge</span>
          </div>
          <div className="h-64 md:h-72 mt-3 min-w-0" data-testid="forecast-chart">
            {chartQuery.isPending ? <div className="h-full rounded-lg bg-muted/40 animate-pulse"/> : chartQuery.isError ? <div role="alert" className="h-full flex items-center justify-center text-sm text-destructive text-center">Unable to load forecast history. Use Refresh to retry.</div> : points.some(p => p.predicted !== null) ? <PredictionChart points={points} range={range} criticalLow={borehole.critical_low_level} optimalHigh={borehole.optimal_high_level}/> : <div className="h-full flex flex-col justify-center items-center text-center gap-2 text-muted-foreground"><Waves className="size-7 opacity-50"/><p className="text-sm">No forecasts in this window yet.</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 mt-3">
            <Stat label="Paired Observations" value={chartQuery.isError ? "—" : String(pairs.length)}/>
            <div className="flex items-start gap-1">
              <Stat label="Mean Absolute Error (MAE)" value={chartQuery.isError || mae === null ? "—" : `${mae.toFixed(2)} cm`}/>
              <InfoTooltip
                title="Paired MAE"
                note="Mean absolute error over forecast/observation pairs inside the selected window only. Not the thesis evaluation score. Missing observations stay unpaired; the value is blank until at least one pair exists."
              />
            </div>
          </div>
          {/* Compact model and matching parameters */}
          <RadixAccordion.Root type="single" collapsible className="mt-4 rounded-lg border border-border overflow-hidden">
            <RadixAccordion.Item value="model">
              <RadixAccordion.Header>
                <RadixAccordion.Trigger className="group flex w-full items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  Model &amp; Sensor Details
                  <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                </RadixAccordion.Trigger>
              </RadixAccordion.Header>
              <RadixAccordion.Content className="px-3 pb-3 pt-1 text-xs text-muted-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0">
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-y border-slate-800/80">
                  <div>
                    <dt>Architecture</dt>
                    <dd className="mt-1 font-medium text-foreground">Linear Level-Change</dd>
                  </div>
                  <div>
                    <dt>Evaluation Margin</dt>
                    <dd className="mt-1 font-medium text-foreground">±35 min match</dd>
                  </div>
                  <div>
                    <dt>Update Cadence</dt>
                    <dd className="mt-1 font-medium text-foreground">Every 30 min (:05 / :35)</dd>
                  </div>
                </dl>
                <div className="flex justify-end pt-3">
                  <Button variant="outline" size="sm" onClick={exportHistory} disabled={!points.length || chartQuery.isError}>
                    <Download className="size-3.5 mr-2"/>Export forecast history (CSV)
                  </Button>
                </div>
              </RadixAccordion.Content>
            </RadixAccordion.Item>
          </RadixAccordion.Root>
        </div>
      </div>
    </section>
  )
}

/** Sleek empty state replacing the blank dark cylinder + error text. */
function ForecastEmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/30 px-3 text-center" aria-live="polite">
      <Waves className="size-5 text-muted-foreground/60" aria-hidden />
      <p className="text-xs text-muted-foreground max-w-36">{message}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-lg md:text-xl tabular-nums">{value}</p><p className="text-[10px] md:text-xs text-muted-foreground mt-1">{label}</p></div>
}
