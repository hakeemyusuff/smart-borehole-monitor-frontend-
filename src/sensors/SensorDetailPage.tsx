import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useBorehole } from "@/boreholes/queries"
import { useSensor } from "@/sensors/queries"
import { useFlowChart, useWaterLevelChart } from "@/readings/queries"
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
              Readings from this sensor over time.
              {showRain && (
                <> Grey bars show hourly rainfall for recharge context.</>
              )}
            </p>
          </div>
          {latest !== null && <LatestReadout value={latest} unit="m" />}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
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
  const latest = latestNonNullValue(chartQuery.data)

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="w-full flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="font-heading text-xl">Flow</CardTitle>
            <p className="text-xs text-muted-foreground">
              Aggregated flow readings — empty windows are between pumping events.
            </p>
          </div>
          {latest !== null && <LatestReadout value={latest} />}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        <ChartArea
          query={chartQuery}
          emptyText="No flow readings for this window."
          render={(points) => <FlowChart points={points} range={range} />}
        />
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

function LatestReadout({ value, unit }: { value: number; unit?: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Latest
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
