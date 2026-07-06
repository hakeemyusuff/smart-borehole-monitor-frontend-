import { Link } from "react-router-dom"
import type { SensorPublic, SensorStatus, SensorType } from "@/lib/types"
import { ApiError } from "@/lib/api"
import { useSensorsForBorehole } from "@/sensors/queries"
import { NewSensorDialog } from "@/sensors/NewSensorDialog"
import { sensorMeta } from "@/sensors/sensor-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SensorsPanel({ boreholeId }: { boreholeId: number }) {
  const query = useSensorsForBorehole(boreholeId)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Instrumentation
          </p>
          <h2 className="font-heading text-2xl">Sensors</h2>
        </div>
        <NewSensorDialog
          boreholeId={boreholeId}
          trigger={<Button size="sm">+ New sensor</Button>}
        />
      </header>

      {query.isPending && <SensorsSkeleton />}
      {query.isError && (
        <SensorsError error={query.error} onRetry={() => query.refetch()} />
      )}
      {query.data && query.data.length === 0 && (
        <SensorsEmpty boreholeId={boreholeId} />
      )}
      {query.data && query.data.length > 0 && (
        <SensorsList sensors={query.data} />
      )}
    </section>
  )
}

function SensorsList({ sensors }: { sensors: SensorPublic[] }) {
  return (
    <div className="flex flex-col gap-3">
      {sensors.map((s, i) => (
        <div
          key={s.id}
          className="animate-in fade-in slide-in-from-bottom-1 duration-500"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
        >
          <Link
            to={`/boreholes/${s.borehole_id}/sensors/${s.id}`}
            className="group block focus-visible:outline-none"
          >
            <SensorRow sensor={s} />
          </Link>
        </div>
      ))}
    </div>
  )
}

function SensorRow({ sensor }: { sensor: SensorPublic }) {
  const meta = sensorMeta(sensor.type)
  return (
    <Card className="w-full transition-[transform,box-shadow,border-color] duration-200 will-change-transform group-hover:scale-[1.01] group-hover:border-primary/50 group-hover:shadow-md group-hover:shadow-black/25 group-focus-visible:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-ring/40">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <SensorMark type={sensor.type} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-heading text-lg truncate">{meta.label}</span>
            <span className="text-xs text-muted-foreground truncate">
              {meta.hint}
              {sensor.last_seen && (
                <>
                  {" · "}
                  <span className="[font-variant-numeric:tabular-nums]">
                    last seen {formatWhen(sensor.last_seen)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
        <StatusBadge status={sensor.status} />
      </CardContent>
    </Card>
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

function SensorMark({ type }: { type: SensorType }) {
  if (type === "flow_meter") {
    return (
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden className="shrink-0">
        <circle
          cx={12}
          cy={12}
          r={9}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.25}
          opacity={0.7}
        />
        <path
          d="M 12 5 L 12 12 L 17 15"
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (type === "esp32") {
    return (
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden className="shrink-0">
        <rect
          x={5}
          y={6}
          width={14}
          height={12}
          rx={2}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.25}
          opacity={0.7}
        />
        <path
          d="M 8 12 h 8"
          stroke="var(--primary)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <circle cx={12} cy={12} r={1.6} fill="var(--primary)" />
      </svg>
    )
  }
  // pressure transducer — a mini borehole silhouette matching the logo language
  return (
    <svg width={22} height={26} viewBox="0 0 22 26" aria-hidden className="shrink-0">
      <rect
        x={4}
        y={2}
        width={14}
        height={22}
        rx={3}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.1}
        opacity={0.65}
      />
      <path
        d="M 4 12 L 4 21 A 3 3 0 0 0 7 24 L 15 24 A 3 3 0 0 0 18 21 L 18 12 Z"
        fill="var(--primary)"
        fillOpacity={0.85}
      />
    </svg>
  )
}

function SensorsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-4"
        >
          <Skeleton className="h-6 w-6" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/5" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

function SensorsEmpty({ boreholeId }: { boreholeId: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-400 border border-dashed border-border rounded-xl p-8 flex flex-col items-center text-center gap-3 bg-card/40">
      <p className="text-muted-foreground text-sm max-w-sm">
        No sensors installed on this borehole yet. Register a pressure transducer, flow meter, or
        ESP32 controller to start capturing readings.
      </p>
      <NewSensorDialog
        boreholeId={boreholeId}
        trigger={<Button variant="outline">+ Register a sensor</Button>}
      />
    </div>
  )
}

function SensorsError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const message =
    error instanceof ApiError ? error.message : "Couldn't reach the server."
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive text-base">
          Couldn't load sensors
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 items-start">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
