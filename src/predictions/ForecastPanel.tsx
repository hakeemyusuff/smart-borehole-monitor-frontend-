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
import { formatWat, isForecastFresh, downloadCsv } from "@/readings/chart-data"
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
  const measuredStale = !captured || now - Date.parse(captured) > 35 * 60_000 || latestQuery.isError
  const fresh = isForecastFresh(status, now, statusQuery.isError)
  const predicted = fresh ? status!.predicted_level_2h : null
  const points = chartQuery.data ?? []
  const pairs = points.filter(p => p.predicted !== null && p.actual !== null)
  const mae = pairs.length ? pairs.reduce((sum,p) => sum + Math.abs(p.predicted! - p.actual!), 0) / pairs.length * 100 : null
  const scale = Math.max(borehole.total_depth || 0, Math.ceil(level ?? 0), Math.ceil(predicted ?? 0), 1)
  const forecastMessage = statusQuery.isError ? "Forecast service unreachable."
    : statusQuery.isPending ? "Checking forecast…"
    : !status ? "No forecast status."
    : status.status === "fresh" && !fresh ? "Forecast expired — waiting for an update."
    : status.message
  const exportHistory = () => downloadCsv(`forecast-${borehole.id}-${range}.csv`,
    ["target_time_utc", "issued_at_utc", "predicted_level_m", "actual_level_m", "model_version"],
    points.map(p => [p.t, p.issued_at, p.predicted, p.actual, p.model_version]))

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card min-w-0" aria-label="Current vs forecast level">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <h2 className="text-xl md:text-2xl font-heading">Current vs Forecast Level</h2>
        <Button variant="outline" size="sm" onClick={() => { void statusQuery.refetch(); void chartQuery.refetch(); void latestQuery.refetch() }} disabled={statusQuery.isFetching || chartQuery.isFetching}><RefreshCw className="size-3.5 mr-2"/>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)] min-w-0">
        {/* Cylinders */}
        <div className="p-4 md:p-5 border-b xl:border-b-0 xl:border-r border-border bg-gradient-to-b from-primary/5 to-transparent min-w-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center rounded-xl border border-primary/20 bg-background/40 px-2 py-3" data-testid="measured-column">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-xs font-medium text-primary">Measured</p>
                <InfoTooltip title="Measured level" note="Most recent sensor reading, in metres above the fixed pressure sensor. Shown on the same scale as the forecast column." />
              </div>
              <p className="text-2xl md:text-3xl tabular-nums mt-3">{level !== null ? level.toFixed(3) : "—"}<span className="text-sm text-muted-foreground ml-1">m</span></p>
              <div className="h-44 md:h-52"><BoreholeCylinder totalDepth={scale} currentLevel={level} isPending={latestQuery.isPending && level === null} criticalLow={borehole.critical_low_level} optimalHigh={borehole.optimal_high_level}/></div>
              <Badge variant="outline" className={cn("mt-2", measuredStale ? "border-warning/40 text-warning" : "border-primary/40 text-primary")}>
                {latestQuery.isError ? "Connection issue" : measuredStale ? "Stale reading" : "Live"}
              </Badge>
              <p className="text-[11px] text-muted-foreground mt-1.5">{formatWat(captured)}</p>
            </div>
            <div className="text-center rounded-xl border border-[#c084fc]/25 bg-[#c084fc]/5 px-2 py-3" data-testid="forecast-column" aria-live="polite">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-xs font-medium text-[#c084fc]">Forecast</p>
                <InfoTooltip title="2-hour forecast" note="Model-estimated level two hours ahead, on the same scale as the measured column. Updates hourly; expires if updates stop." />
              </div>
              <p className="text-2xl md:text-3xl tabular-nums mt-3">{predicted !== null ? predicted.toFixed(3) : "—"}<span className="text-sm text-muted-foreground ml-1">m</span></p>
              <div className="h-44 md:h-52">
                {predicted !== null
                  ? <BoreholeCylinder totalDepth={scale} currentLevel={predicted} variant="forecast" isPending={statusQuery.isPending} criticalLow={borehole.critical_low_level} optimalHigh={borehole.optimal_high_level}/>
                  : <ForecastEmptyState message={forecastMessage} />}
              </div>
              {predicted !== null && <p className="text-[11px] text-muted-foreground mt-1.5">For {formatWat(status?.predicted_for)}</p>}
            </div>
          </div>
        </div>
        {/* History chart + stats */}
        <div className="p-4 md:p-5 min-w-0">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading text-lg">Forecast history</h3>                <InfoTooltip title="Forecast history" note="Forecast target times (violet, dashed) against observed levels (teal, solid, with point markers). Lines are drawn continuously across missing hours so small forecast/observed differences stay visible; the Y axis zooms to the data." />
            </div>
            <RangeSelector value={range} onChange={setRange}/>
          </div>
          <div className="h-64 md:h-72 mt-3 min-w-0" data-testid="forecast-chart">
            {chartQuery.isPending ? <div className="h-full rounded-lg bg-muted/40 animate-pulse"/> : chartQuery.isError ? <div role="alert" className="h-full flex items-center justify-center text-sm text-destructive text-center">Unable to load forecast history. Use Refresh to retry.</div> : points.some(p => p.predicted !== null) ? <PredictionChart points={points} range={range} criticalLow={borehole.critical_low_level} optimalHigh={borehole.optimal_high_level}/> : <div className="h-full flex flex-col justify-center items-center text-center gap-2 text-muted-foreground"><Waves className="size-7 opacity-50"/><p className="text-sm">No forecasts in this window yet.</p></div>}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 mt-3">
            <Stat label="Saved forecasts" value={chartQuery.isError ? "—" : String(points.filter(p => p.predicted !== null).length)}/>
            <Stat label="Observed pairs" value={chartQuery.isError ? "—" : String(pairs.length)}/>
            <div className="flex items-start gap-1">
              <Stat label="Paired MAE" value={chartQuery.isError || mae === null ? "—" : `${mae.toFixed(2)} cm`}/>
              <InfoTooltip
                title="Paired MAE"
                note="Mean absolute error over forecast/observation pairs inside the selected window only. Not the thesis evaluation score. Missing observations stay unpaired; the value is blank until at least one pair exists."
              />
            </div>
          </div>
          {/* All methodology + model diagnostics collapsed behind one accordion */}
          <RadixAccordion.Root type="single" collapsible className="mt-4 rounded-lg border border-border overflow-hidden">
            <RadixAccordion.Item value="model">
              <RadixAccordion.Header>
                <RadixAccordion.Trigger className="group flex w-full items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  Model &amp; Sensor Details
                  <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                </RadixAccordion.Trigger>
              </RadixAccordion.Header>
              <RadixAccordion.Content className="px-3 pb-3 pt-1 text-xs text-muted-foreground space-y-2 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                <div><p className="text-foreground/80 font-medium">Model version</p><p className="break-all">{status?.model_version ?? "Unavailable"}</p></div>
                {fresh && <div><p className="text-foreground/80 font-medium">Issued</p><p>{formatWat(status?.issued_at)}</p></div>}
                {fresh && level !== null && predicted !== null && <div><p className="text-foreground/80 font-medium">Expected change</p><p>{((predicted-level)*100).toFixed(1)} cm relative to the latest measurement</p></div>}
                <p>Level-change regression on recent water-level movement; hourly cutoff, job runs at five minutes past each hour. Unexpected future pumping is not supplied to the model.</p>
                <p>Cylinders show height above the pressure sensor on one shared scale — not pumping volume. Error pairs match within ±35 minutes; missing hours remain gaps.</p>
                <div className="pt-1"><Button variant="outline" size="sm" onClick={exportHistory} disabled={!points.length || chartQuery.isError}><Download className="size-3.5 mr-2"/>Export forecast history (CSV)</Button></div>
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
