import { Link, useParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useBorehole } from "@/boreholes/queries"
import { useSensor } from "@/sensors/queries"
import { useFlowReadings, useWaterLevelReadings } from "@/readings/queries"
import { FlowChart } from "@/readings/FlowChart"
import { WaterLevelChart } from "@/readings/WaterLevelChart"
import { sensorMeta } from "@/sensors/sensor-types"
import type { FlowReading, SensorPublic, SensorStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  criticalLow,
  optimalHigh,
}: {
  boreholeId: number
  sensorId: number
  criticalLow?: number
  optimalHigh?: number
}) {
  const waterQuery = useWaterLevelReadings(boreholeId, sensorId)
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <CardTitle className="font-heading text-xl">Water level</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Readings from this sensor over time.
          </p>
        </div>
        {waterQuery.data && waterQuery.data.length > 0 && (
          <LatestReadout
            latest={waterQuery.data[waterQuery.data.length - 1].water_level}
          />
        )}
      </CardHeader>
      <CardContent>
        {waterQuery.isPending && <Skeleton className="h-72 w-full" />}
        {waterQuery.isError && (
          <div className="flex flex-col gap-3 items-start">
            <p className="text-destructive text-sm">
              {waterQuery.error instanceof ApiError
                ? waterQuery.error.message
                : "Couldn't load readings."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => waterQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {waterQuery.data && waterQuery.data.length === 0 && (
          <div className="h-72 flex items-center justify-center text-center">
            <p className="text-muted-foreground text-sm max-w-xs">
              No readings yet. Once the sensor comes online, its water-level readings will
              appear here.
            </p>
          </div>
        )}
        {waterQuery.data && waterQuery.data.length > 0 && (
          <WaterLevelChart
            readings={waterQuery.data}
            criticalLow={criticalLow}
            optimalHigh={optimalHigh}
          />
        )}
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
  const flowQuery = useFlowReadings(boreholeId, sensorId)
  const latest =
    flowQuery.data && flowQuery.data.length > 0
      ? flowQuery.data[flowQuery.data.length - 1]
      : undefined

  return (
    <Card className="w-full">
      <CardHeader className="flex-row items-end justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="font-heading text-xl">Flow</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pulse-count readings from this flow meter over time.
          </p>
        </div>
        {latest && <LatestFlowReadout latest={latest} />}
      </CardHeader>
      <CardContent>
        {flowQuery.isPending && <Skeleton className="h-72 w-full" />}
        {flowQuery.isError && (
          <div className="flex flex-col gap-3 items-start">
            <p className="text-destructive text-sm">
              {flowQuery.error instanceof ApiError
                ? flowQuery.error.message
                : "Couldn't load readings."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => flowQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {flowQuery.data && flowQuery.data.length === 0 && (
          <div className="h-72 flex items-center justify-center text-center">
            <p className="text-muted-foreground text-sm max-w-xs">
              No readings yet. Once the flow meter comes online, its readings will appear here.
            </p>
          </div>
        )}
        {flowQuery.data && flowQuery.data.length > 0 && (
          <FlowChart readings={flowQuery.data} />
        )}
      </CardContent>
    </Card>
  )
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

function LatestReadout({ latest }: { latest: number }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Latest
      </span>
      <span className="text-2xl [font-variant-numeric:tabular-nums] text-foreground">
        {latest.toFixed(2)}
        <span className="text-muted-foreground text-base ml-1">m</span>
      </span>
    </div>
  )
}

function LatestFlowReadout({ latest }: { latest: FlowReading }) {
  // Prefer the calculated flow rate when the hardware phase has populated
  // it, and fall back to raw pulses otherwise so the readout is never blank.
  const hasRate =
    latest.calculated_flow_rate !== null &&
    latest.calculated_flow_rate !== undefined
  const value = hasRate ? latest.calculated_flow_rate! : latest.raw_reading
  const unit = hasRate ? "L/min" : "raw"
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Latest
      </span>
      <span className="text-2xl [font-variant-numeric:tabular-nums] text-foreground">
        {value.toFixed(2)}
        <span className="text-muted-foreground text-base ml-1">{unit}</span>
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
