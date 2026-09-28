import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useBorehole } from "@/boreholes/queries"
import { useSensor } from "@/sensors/queries"
import { useFlowChart, useWaterLevelChart } from "@/readings/queries"
import { usePumpWindows } from "@/pump/queries"
import { useWeatherChart } from "@/weather/queries"
import { FlowChart } from "@/readings/FlowChart"
import { WaterLevelChart } from "@/readings/WaterLevelChart"
import { sensorMeta } from "@/sensors/sensor-types"
import type { ChartPoint, ChartRange, SensorPublic, SensorStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageShell } from "@/components/PageShell"
import { RangeSelector } from "@/components/RangeSelector"
import { Skeleton } from "@/components/ui/skeleton"
import { rangeDescription, downloadCsv, formatWat, buildDailyVolumes } from "@/readings/chart-data"

export function SensorDetailPage() {
  const params = useParams<{ boreholeId: string; sensorId: string }>()
  const boreholeId = params.boreholeId ? Number(params.boreholeId) : undefined
  const sensorId = params.sensorId ? Number(params.sensorId) : undefined
  const idsValid =
    boreholeId !== undefined &&
    sensorId !== undefined &&
    !Number.isNaN(boreholeId) &&
    !Number.isNaN(sensorId)

  const sensorQuery = useSensor(idsValid ? sensorId : undefined)
  const boreholeQuery = useBorehole(idsValid ? boreholeId : undefined)

  return (
    <PageShell>
      <section className="flex flex-col gap-8">
      <nav>
        <Link
          to={idsValid ? `/boreholes/${boreholeId}` : "/locations"}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 inline-flex items-center gap-1.5"
        >
          <span aria-hidden>←</span>
          {idsValid ? " Back to borehole" : " All locations"}
        </Link>
      </nav>

      {!idsValid && (
        <p className="text-destructive">That sensor path doesn't look right.</p>
      )}

      {idsValid && sensorQuery.isPending && <SensorHeaderSkeleton />}

      {idsValid && sensorQuery.isError && (
        <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
          <p className="text-destructive">
            {sensorQuery.error instanceof ApiError
              ? sensorQuery.error.message
              : "Couldn't load this sensor."}
          </p>
          <Button variant="outline" onClick={() => sensorQuery.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {sensorQuery.data && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <SensorHeader
            sensor={sensorQuery.data}
            boreholeName={boreholeQuery.data?.name}
          />

          {sensorQuery.data.type === "pressure_transducer" && (
            <WaterLevelPanel
              boreholeId={boreholeId!}
              sensorId={sensorId!}
              locationId={boreholeQuery.data?.location_id ?? undefined}
              criticalLow={boreholeQuery.data?.critical_low_level}
              optimalHigh={boreholeQuery.data?.optimal_high_level}
            />
          )}

          {sensorQuery.data.type === "flow_meter" && (
            <FlowPanel boreholeId={boreholeId!} sensorId={sensorId!} />
          )}

          {sensorQuery.data.type === "esp32" && (
            <PlaceholderPanel
              title="Controller"
              description="This ESP32 is a Wi-Fi bridge that forwards readings on behalf of the physical probes it controls. It doesn't produce readings on its own — open one of the probes to see its data."
            />
          )}
        </div>
      )}
      </section>
    </PageShell>
  )
}

function SensorHeader({
  sensor,
  boreholeName,
}: {
  sensor: SensorPublic
  boreholeName: string | undefined
}) {
  const meta = sensorMeta(sensor.type)
  return (
    <header className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Sensor
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-4xl font-medium">{meta.label}</h1>
        <StatusBadge status={sensor.status} />
      </div>
      <p className="text-muted-foreground text-sm mt-1">
        {boreholeName ? (
          <>
            on{" "}
            <Link
              to={`/boreholes/${sensor.borehole_id}`}
              className="text-foreground underline underline-offset-4 hover:text-primary transition-colors duration-150"
            >
              {boreholeName}
            </Link>
            {" · "}
          </>
        ) : null}
        {meta.hint}
      </p>
    </header>
  )
}

function StatusBadge({ status }: { status: SensorStatus }) {
  if (status === "active") {
    return (
      <Badge className="bg-primary/15 text-primary border-primary/30 gap-1.5">
        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
        Active
      </Badge>
    )
  }
  if (status === "faulty") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30">
        Faulty
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  )
}

function WaterLevelPanel({
  boreholeId,
  sensorId,
  locationId,
  criticalLow,
  optimalHigh,
}: {
  boreholeId: number
  sensorId: number
  locationId?: number
  criticalLow?: number
  optimalHigh?: number
}) {
  const [range, setRange] = useState<ChartRange>("day")
  const chartQuery = useWaterLevelChart(boreholeId, sensorId, range)
  const latest = latestNonNullValue(chartQuery.data)
  // Rain overlay is only useful over Week/Month — a single day of hourly
  // bars is too noisy for the recharge story. On Day view we pass no
  // rainPoints, which turns the overlay off entirely.
  const showRain = range === "week" || range === "month"
  const rainQuery = useWeatherChart(
    showRain ? locationId : undefined,
    range,
  )

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="w-full flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="font-heading text-xl">Water level</CardTitle>
            <p className="text-xs text-muted-foreground">
              {rangeDescription[range]}. Height above the pressure sensor.
              {showRain && (
                <> Weather snapshots are shown separately below.</>
              )}
            </p>
          </div>
          {latest !== null && <LatestReadout value={latest} unit="m" label={range === "day" ? "Latest in window" : "Latest bucket average"} />}
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <RangeSelector value={range} onChange={setRange} />
          {showRain && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
              <span
                className="w-3 h-2.5 rounded-sm"
                style={{ background: "#5B9BD5", opacity: 0.35 }}
                aria-hidden
              />
              Precipitation snapshots (mm)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ReadingSummary points={chartQuery.isError ? undefined : chartQuery.data} unit="m" range={range} filename={`water-level-${sensorId}-${range}`}/>
        <ChartArea
          query={chartQuery}
          emptyText="No readings for this window yet."
          render={(points) => (
            <WaterLevelChart
              points={points}
              range={range}
              criticalLow={criticalLow}
              optimalHigh={optimalHigh}
              rainPoints={showRain ? rainQuery.data : undefined}
            />
          )}
        />
      </CardContent>
    </Card>
  )
}

function FlowPanel({
  boreholeId,
  sensorId,
}: {
  boreholeId: number
  sensorId: number
}) {
  const [range, setRange] = useState<ChartRange>("day")
  const chartQuery = useFlowChart(boreholeId, sensorId, range)
  // Week/month plots daily abstracted volume from pump-run windows (the
  // rate chart only makes sense at day granularity).
  const pumpWindowsQuery = usePumpWindows(boreholeId)
  const dailyVolumes = useMemo(
    () =>
      range === "day" || !pumpWindowsQuery.data || pumpWindowsQuery.isError
        ? undefined
        : buildDailyVolumes(pumpWindowsQuery.data, range, Date.now()),
    [range, pumpWindowsQuery.data, pumpWindowsQuery.isError],
  )
  // Only a pump-windows failure blocks the volume chart; a window with no
  // runs still renders (empty axis + "no activity" caption in the chart).
  const volumeUnavailable = range !== "day" && pumpWindowsQuery.isError
  const latest = latestNonNullValue(chartQuery.data)

  // In volume mode the rate series is irrelevant to the empty-state check —
  // the pump may have run without the rate endpoint returning samples.
  const areaQuery: ChartQueryLike =
    range === "day"
      ? chartQuery
      : {
          isPending: pumpWindowsQuery.isPending,
          // A rate-endpoint failure must not block the volume chart — the
          // volume series comes from pump windows, not the rate samples.
          isError: false,
          error: null,
          data:
            chartQuery.data && chartQuery.data.length > 0
              ? chartQuery.data
              : [{ t: new Date().toISOString(), value: null }],
          refetch: () => {
            chartQuery.refetch()
            pumpWindowsQuery.refetch()
          },
        }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="w-full flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="font-heading text-xl">Flow</CardTitle>
            <p className="text-xs text-muted-foreground">
              {range === "day"
                ? `${rangeDescription[range]}. Missing records do not prove the pump was off.`
                : "Estimated abstraction per calendar day. Pump-window totals are allocated by estimated duration; missing records do not prove zero pumping."}
            </p>
          </div>
          {latest !== null && <LatestReadout value={latest} unit="L/min" label={range === "day" ? "Latest in window" : "Latest bucket average"} />}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        {range === "day" && <ReadingSummary points={chartQuery.isError ? undefined : chartQuery.data} unit="L/min" range={range} filename={`flow-${sensorId}-${range}`}/>}
        {volumeUnavailable ? (
          <p className="text-sm text-muted-foreground">Daily volume needs pump-run data for this borehole.</p>
        ) : (
          <ChartArea
            query={areaQuery}
            emptyText="No flow readings for this window."
            render={(points) => <FlowChart points={points} range={range} dailyVolumes={dailyVolumes} />}
          />
        )}
      </CardContent>
    </Card>
  )
}

type ChartQueryLike = {
  isPending: boolean
  isError: boolean
  error: unknown
  data: ChartPoint[] | undefined
  refetch: () => void
}

function ChartArea({
  query,
  emptyText,
  render,
}: {
  query: ChartQueryLike
  emptyText: string
  render: (points: ChartPoint[]) => React.ReactNode
}) {
  if (query.isPending) {
    return <Skeleton className="h-72 md:h-80 w-full" />
  }
  if (query.isError) {
    return (
      <div className="flex flex-col gap-3 items-start">
        <p className="text-destructive text-sm">
          {query.error instanceof ApiError
            ? query.error.message
            : "Couldn't load readings."}
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  if (!query.data || query.data.length === 0) {
    return (
      <div className="h-72 md:h-80 flex items-center justify-center text-center">
        <p className="text-muted-foreground text-sm max-w-xs">{emptyText}</p>
      </div>
    )
  }
  return <div className="h-72 md:h-80 w-full">{render(query.data)}</div>
}

function PlaceholderPanel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground max-w-prose">{description}</p>
      </CardContent>
    </Card>
  )
}

function LatestReadout({ value, unit, label }: { value: number; unit?: string; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl [font-variant-numeric:tabular-nums] text-foreground">
        {value.toFixed(2)}
        {unit && (
          <span className="text-muted-foreground text-base ml-1">{unit}</span>
        )}
      </span>
    </div>
  )
}

function SensorHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-4 w-96 mt-1" />
    </div>
  )
}

function latestNonNullValue(points: ChartPoint[] | undefined): number | null {
  if (!points) return null
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].value
    if (v !== null && v !== undefined) return v
  }
  return null
}


function ReadingSummary({ points, unit, range, filename }: { points?: ChartPoint[]; unit: string; range: ChartRange; filename: string }) {
  const valid=(points ?? []).filter((p): p is ChartPoint & { value: number } => p.value !== null && Number.isFinite(p.value)).sort((a,b) => Date.parse(a.t)-Date.parse(b.t))
  if (!valid.length) return null
  const values=valid.map(p => p.value)
  return <div className="mb-5 flex flex-wrap gap-4 items-center justify-between border-y border-border py-3">
    <div className="flex flex-wrap gap-5 text-xs"><span><strong className="text-foreground">{valid.length}</strong> {range === "day" ? "readings" : "populated buckets"}</span><span>Min <strong>{Math.min(...values).toFixed(2)} {unit}</strong></span><span>Max <strong>{Math.max(...values).toFixed(2)} {unit}</strong></span><span className="text-muted-foreground">Latest point: {formatWat(valid.at(-1)!.t)}</span></div>
    <Button size="sm" variant="outline" onClick={() => downloadCsv(`${filename}.csv`,["time_utc",`value_${unit === "m" ? "m" : "litres_per_minute"}`,"aggregation"],(points ?? []).map(p => [p.t,p.value,range === "day" ? "individual reading" : range === "week" ? "hourly sample average" : "daily sample average"]))}>Export CSV</Button>
  </div>
}
