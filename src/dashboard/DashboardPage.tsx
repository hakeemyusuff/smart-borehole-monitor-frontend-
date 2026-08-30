import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useLocations } from "@/locations/queries"
import { useBoreholes } from "@/boreholes/queries"
import { useSensorsForBorehole } from "@/sensors/queries"
import { useReadingsPage } from "@/data-logs/queries"
import { useFlowChart, useWaterLevelChart } from "@/readings/queries"
import { usePredictionChart } from "@/predictions/queries"
import { WaterLevelChart } from "@/readings/WaterLevelChart"
import { FlowChart } from "@/readings/FlowChart"
import { PredictionChart } from "@/predictions/PredictionChart"
import { BoreholeCylinder } from "@/dashboard/BoreholeCylinder"
import { usePump, useChangePumpStatus } from "@/pump/queries"
import { usePumpWindows } from "@/pump/queries"
import { useWeatherSeries } from "@/weather/queries"
import { cn } from "@/lib/utils"
import type {
  Borehole,
  ChartPoint,
  Location,
  PredictionChartPoint,
  PumpStatus,
  SensorPublic,
  WaterLevelReading,
  Weather,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const locationId = numOrUndef(params.get("location"))
  const boreholeId = numOrUndef(params.get("borehole"))

  const locationsQuery = useLocations()
  const boreholesQuery = useBoreholes()

  const boreholesInLocation = useMemo<Borehole[]>(() => {
    if (!boreholesQuery.data || locationId === undefined) return []
    return boreholesQuery.data.filter((b) => b.location_id === locationId)
  }, [boreholesQuery.data, locationId])

  useEffect(() => {
    if (
      locationId === undefined &&
      locationsQuery.data &&
      locationsQuery.data.length > 0
    ) {
      const first = locationsQuery.data[0].id
      if (first !== undefined && first !== null) {
        setParams(
          (p) => {
            p.set("location", String(first))
            return p
          },
          { replace: true },
        )
      }
    }
  }, [locationId, locationsQuery.data, setParams])

  useEffect(() => {
    if (locationId === undefined || boreholesInLocation.length === 0) return
    const stillValid = boreholesInLocation.some((b) => b.id === boreholeId)
    if (!stillValid) {
      const first = boreholesInLocation[0].id
      if (first !== undefined && first !== null) {
        setParams(
          (p) => {
            p.set("borehole", String(first))
            return p
          },
          { replace: true },
        )
      }
    }
  }, [locationId, boreholeId, boreholesInLocation, setParams])

  const currentIndex = boreholesInLocation.findIndex((b) => b.id === boreholeId)
  const currentBorehole =
    currentIndex >= 0 ? boreholesInLocation[currentIndex] : undefined

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-6 overflow-y-auto min-w-0">
      <DashboardHeader
        locations={locationsQuery.data ?? []}
        locationsPending={locationsQuery.isPending}
        locationId={locationId}
        onLocationChange={(id) =>
          setParams((p) => {
            p.set("location", String(id))
            p.delete("borehole")
            return p
          })
        }
        currentBorehole={currentBorehole}
        boreholeIndex={currentIndex}
        boreholeTotal={boreholesInLocation.length}
        onBoreholeStep={(delta) => {
          const target = boreholesInLocation[currentIndex + delta]
          if (target?.id !== undefined && target.id !== null) {
            setParams((p) => {
              p.set("borehole", String(target.id))
              return p
            })
          }
        }}
      />

      <LocationGate
        locationsPending={locationsQuery.isPending}
        hasLocation={(locationsQuery.data ?? []).length > 0}
        locationSelected={locationId !== undefined}
        boreholesPending={boreholesQuery.isPending}
        boreholesError={
          boreholesQuery.isError
            ? boreholesQuery.error instanceof ApiError
              ? boreholesQuery.error.message
              : "Couldn't load boreholes."
            : null
        }
        onRetryBoreholes={() => boreholesQuery.refetch()}
        boreholesInLocation={boreholesInLocation}
      >
        {currentBorehole && <BoreholeGrid borehole={currentBorehole} />}
      </LocationGate>
    </div>
  )
}

function DashboardHeader({
  locations,
  locationsPending,
  locationId,
  onLocationChange,
  currentBorehole,
  boreholeIndex,
  boreholeTotal,
  onBoreholeStep,
}: {
  locations: Location[]
  locationsPending: boolean
  locationId: number | undefined
  onLocationChange: (id: number) => void
  currentBorehole: Borehole | undefined
  boreholeIndex: number
  boreholeTotal: number
  onBoreholeStep: (delta: -1 | 1) => void
}) {
  const canPrev = boreholeIndex > 0
  const canNext = boreholeIndex >= 0 && boreholeIndex < boreholeTotal - 1
  return (
    <header className="shrink-0 flex items-end justify-between gap-4 flex-wrap mb-4 md:mb-6">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Overview
        </p>
        <h1 className="text-3xl md:text-4xl font-medium">Dashboard</h1>
      </div>

      <div className="flex items-end gap-3 md:gap-4 flex-wrap">
        <label className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Location
          </span>
          <Select
            value={locationId !== undefined ? String(locationId) : undefined}
            onValueChange={(v) => onLocationChange(Number(v))}
            disabled={locationsPending || locations.length === 0}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Choose a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {currentBorehole && (
          <div className="flex items-center gap-2 min-w-0">
            <Button
              size="icon"
              variant="outline"
              disabled={!canPrev}
              aria-label="Previous borehole"
              onClick={() => onBoreholeStep(-1)}
            >
              <span aria-hidden>←</span>
            </Button>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Borehole {boreholeIndex + 1} of {boreholeTotal}
              </span>
              <span className="text-lg font-heading truncate">
                {currentBorehole.name}
              </span>
            </div>
            <Button
              size="icon"
              variant="outline"
              disabled={!canNext}
              aria-label="Next borehole"
              onClick={() => onBoreholeStep(1)}
            >
              <span aria-hidden>→</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}

function BoreholeGrid({ borehole }: { borehole: Borehole }) {
  const boreholeId = borehole.id ?? undefined
  const sensorsQuery = useSensorsForBorehole(boreholeId)
  const sensors: SensorPublic[] = sensorsQuery.data ?? []

  const pressureSensor = sensors.find((s) => s.type === "pressure_transducer")
  const flowSensor = sensors.find((s) => s.type === "flow_meter")

  return (
    <div className="flex flex-col gap-5 md:gap-6 animate-in fade-in duration-300 min-w-0">
      {/* ── Status strip ── */}
      <StatusStrip
        boreholeId={boreholeId}
        pressureSensor={pressureSensor}
        sensorsPending={sensorsQuery.isPending}
        criticalLow={borehole.critical_low_level}
        optimalHigh={borehole.optimal_high_level}
        locationId={borehole.location_id ?? undefined}
      />

      {/* ── Section: Live status ── */}
      <div className="flex flex-col gap-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-0.5">
          Live status
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 min-w-0 items-stretch">
          <div className="flex flex-col min-w-0 lg:col-span-4 lg:h-full">
            <CylinderCard
              borehole={borehole}
              boreholeId={boreholeId}
              pressureSensor={pressureSensor}
              sensorsPending={sensorsQuery.isPending}
            />
          </div>
          <div className="flex flex-col min-w-0 lg:col-span-8 lg:h-full">
            <ChartCard
              title="Water level (24h)"
              subtitle="Recent readings from the pressure transducer"
              stretch
              viewHref={
                pressureSensor && boreholeId !== undefined
                  ? `/boreholes/${boreholeId}/sensors/${pressureSensor.id}`
                  : undefined
              }
            >
              <WaterLevelOverviewBody
                boreholeId={boreholeId}
                sensor={pressureSensor}
                sensorsPending={sensorsQuery.isPending}
                criticalLow={borehole.critical_low_level}
                optimalHigh={borehole.optimal_high_level}
              />
            </ChartCard>
          </div>
        </div>
      </div>

      {/* ── Section: Analysis ── */}
      <div
        className="flex flex-col gap-4 -mx-4 md:-mx-6 px-4 md:px-6 py-5 -my-1"
        style={{
          background: "rgba(18, 39, 48, 0.4)",
          borderTop: "1px solid rgba(30, 55, 66, 0.5)",
          borderBottom: "1px solid rgba(30, 55, 66, 0.5)",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-0.5">
          Analysis
        </p>

        <ChartCard
          title="Predicted vs actual (24h)"
          subtitle="Model forecast overlaid on real readings"
          legend={
            <div className="flex gap-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-4 h-0 border-t-2 border-primary inline-block" />
                Actual
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-4 h-0 border-t-[1.5px] border-dashed border-primary/60 inline-block" />
                Predicted
              </span>
            </div>
          }
        >
          <PredictionsOverviewBody
            boreholeId={boreholeId}
            criticalLow={borehole.critical_low_level}
            optimalHigh={borehole.optimal_high_level}
          />
        </ChartCard>

        <ChartCard
          title="Flow (24h)"
          subtitle="Abstraction rate from the flow meter"
          viewHref={
            flowSensor && boreholeId !== undefined
              ? `/boreholes/${boreholeId}/sensors/${flowSensor.id}`
              : undefined
          }
        >
          <FlowOverviewBody
            boreholeId={boreholeId}
            sensor={flowSensor}
            sensorsPending={sensorsQuery.isPending}
          />
        </ChartCard>
      </div>
    </div>
  )
}

// ─── Status strip ────────────────────────────────────────────────────────────

function StatusStrip({
  boreholeId,
  pressureSensor,
  sensorsPending,
  criticalLow,
  optimalHigh,
  locationId,
}: {
  boreholeId: number | undefined
  pressureSensor: SensorPublic | undefined
  sensorsPending: boolean
  criticalLow: number
  optimalHigh: number
  locationId: number | undefined
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-border overflow-hidden bg-card min-w-0">
      <WaterLevelCell
        boreholeId={boreholeId}
        pressureSensor={pressureSensor}
        sensorsPending={sensorsPending}
        criticalLow={criticalLow}
        optimalHigh={optimalHigh}
      />
      <PumpStatusCell boreholeId={boreholeId} />
      <PumpRunCell boreholeId={boreholeId} />
      <WeatherCell locationId={locationId} />
    </div>
  )
}

function StatusCell({
  label,
  accent,
  children,
  className,
}: {
  label: string
  accent?: "primary" | "destructive" | "warning"
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative px-4 py-3.5 flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-border/70 last:border-r-0 last:border-b-0",
        className,
      )}
    >
      {accent && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-0.5",
            accent === "primary" && "bg-primary",
            accent === "destructive" && "bg-destructive",
            accent === "warning" && "bg-warning",
          )}
        />
      )}
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

function WaterLevelCell({
  boreholeId,
  pressureSensor,
  sensorsPending,
  criticalLow,
  optimalHigh,
}: {
  boreholeId: number | undefined
  pressureSensor: SensorPublic | undefined
  sensorsPending: boolean
  criticalLow: number
  optimalHigh: number
}) {
  const latestQuery = useReadingsPage(
    "water-level",
    boreholeId,
    pressureSensor?.id,
    0,
    1,
  )
  const latest: WaterLevelReading | undefined = latestQuery.data?.items[0]
  const level = latest?.water_level ?? null

  const isPending = sensorsPending || (pressureSensor && latestQuery.isPending)

  if (isPending) {
    return (
      <StatusCell label="Water level">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-3 w-28" />
      </StatusCell>
    )
  }

  if (!pressureSensor || level === null) {
    return (
      <StatusCell label="Water level">
        <span className="text-sm text-muted-foreground">No sensor data</span>
      </StatusCell>
    )
  }

  const state =
    level < criticalLow
      ? { text: "Critical", accent: "destructive" as const, badge: "bg-destructive/15 text-destructive" }
      : level >= optimalHigh
        ? { text: "Optimal", accent: "primary" as const, badge: "bg-primary/15 text-primary" }
        : { text: "Below optimal", accent: "warning" as const, badge: "bg-warning/15 text-warning" }

  return (
    <StatusCell label="Water level" accent={state.accent}>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-medium [font-variant-numeric:tabular-nums] text-foreground">
          {level.toFixed(2)}
        </span>
        <span className="text-[11px] text-muted-foreground">m</span>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium w-fit",
          state.badge,
        )}
      >
        ● {state.text}
      </span>
      <span className="text-[10px] text-muted-foreground/60 [font-variant-numeric:tabular-nums]">
        {latest ? `As of ${formatShortTs(latest.captured_at)}` : "—"}
      </span>
    </StatusCell>
  )
}

function PumpStatusCell({ boreholeId }: { boreholeId: number | undefined }) {
  const query = usePump(boreholeId)
  const change = useChangePumpStatus(boreholeId!)
  const [confirmingTo, setConfirmingTo] = useState<PumpStatus | null>(null)

  if (query.isPending) {
    return (
      <StatusCell label="Pump status">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3 w-36" />
      </StatusCell>
    )
  }

  if (query.isError || !query.data) {
    return (
      <StatusCell label="Pump status">
        <span className="text-sm text-muted-foreground">No pump</span>
      </StatusCell>
    )
  }

  const pump = query.data
  const nextStatus: PumpStatus = pump.status === "on" ? "off" : "on"

  const onConfirm = () => {
    if (confirmingTo === null) return
    change.mutate(confirmingTo, {
      onSuccess: (res) => {
        toast.success(
          `Pump ${res.pump.status === "on" ? "turned on" : "turned off"}`,
        )
        setConfirmingTo(null)
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.message : "Couldn't change pump status"
        toast.error(msg)
      },
    })
  }

  const since = pump.last_status_change
    ? relativeTime(pump.last_status_change)
    : "—"

  return (
    <>
      <StatusCell label="Pump status">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={pump.status === "on"}
            aria-label={
              pump.status === "on" ? "Turn pump off" : "Turn pump on"
            }
            disabled={change.isPending}
            onClick={() => setConfirmingTo(nextStatus)}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              pump.status === "on" ? "bg-primary" : "bg-border",
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
                pump.status === "on" ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
          <span
            className={cn(
              "text-[11px] font-medium",
              pump.status === "on" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {pump.status === "on" ? "ON" : "OFF"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 [font-variant-numeric:tabular-nums]">
          Since {since} · {pump.power_rating} kW · {pump.depth}m
        </span>
      </StatusCell>

      <Dialog
        open={confirmingTo !== null}
        onOpenChange={(open) => {
          if (!open && !change.isPending) setConfirmingTo(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmingTo === "on" ? "Turn pump ON?" : "Turn pump OFF?"}
            </DialogTitle>
            <DialogDescription>
              This sends a command to the physical pump. It will be recorded
              in the pump history as a manual override.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmingTo(null)}
              disabled={change.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmingTo === "off" ? "outline" : "default"}
              onClick={onConfirm}
              disabled={change.isPending}
            >
              {change.isPending
                ? "Sending…"
                : confirmingTo === "on"
                  ? "Turn ON"
                  : "Turn OFF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PumpRunCell({ boreholeId }: { boreholeId: number | undefined }) {
  const query = usePumpWindows(boreholeId)

  if (query.isPending) {
    return (
      <StatusCell label="Latest pump run">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-36" />
      </StatusCell>
    )
  }

  if (query.isError || !query.data?.[0]) {
    return (
      <StatusCell label="Latest pump run">
        <span className="text-sm text-muted-foreground">No runs yet</span>
      </StatusCell>
    )
  }

  const latest = query.data[0]

  return (
    <StatusCell label="Latest pump run">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-medium [font-variant-numeric:tabular-nums] text-foreground">
          {formatVolume(latest.volume_litres)}
        </span>
        <span className="text-[11px] text-muted-foreground">L</span>
      </div>
      <span className="text-[10px] text-muted-foreground/60 [font-variant-numeric:tabular-nums]">
        {formatDuration(latest.duration_min)} · {latest.avg_rate.toFixed(1)} L/min
        avg
      </span>
      <span className="text-[10px] text-muted-foreground/60 [font-variant-numeric:tabular-nums]">
        Started {formatShortTs(latest.start)}
      </span>
    </StatusCell>
  )
}

function WeatherCell({
  locationId,
}: {
  locationId: number | undefined
}) {
  const query = useWeatherSeries(locationId)

  const latest = useMemo<Weather | null>(() => {
    if (!query.data || query.data.length === 0) return null
    return query.data[query.data.length - 1]
  }, [query.data])

  if (query.isPending) {
    return (
      <StatusCell label="Weather">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
      </StatusCell>
    )
  }

  if (query.isError || !latest) {
    return (
      <StatusCell label="Weather">
        <span className="text-sm text-muted-foreground">No data</span>
      </StatusCell>
    )
  }

  return (
    <StatusCell label="Weather">
      <div className="flex items-center gap-4 flex-wrap">
        <WeatherStat label="Temp" value={fmt(latest.temperature, 1)} unit="°C" />
        <WeatherStat label="Humidity" value={fmt(latest.humidity, 0)} unit="%" />
        <WeatherStat label="Rain" value={fmt(latest.precipitation, 1)} unit="mm" />
      </div>
      <span className="text-[10px] text-muted-foreground/60 [font-variant-numeric:tabular-nums]">
        {formatWhen(latest.created_at)}
      </span>
    </StatusCell>
  )
}

function WeatherStat({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </span>
      <span className="text-[13px] [font-variant-numeric:tabular-nums]">
        {value}
        <span className="text-muted-foreground ml-0.5">{unit}</span>
      </span>
    </div>
  )
}

// ─── Chart cards ─────────────────────────────────────────────────────────────

function CylinderCard({
  borehole,
  boreholeId,
  pressureSensor,
  sensorsPending,
}: {
  borehole: Borehole
  boreholeId: number | undefined
  pressureSensor: SensorPublic | undefined
  sensorsPending: boolean
}) {
  const latestQuery = useReadingsPage(
    "water-level",
    boreholeId,
    pressureSensor?.id,
    0,
    1,
  )
  const latest = latestQuery.data?.items[0]
  const currentLevel = latest?.water_level ?? null

  const hasSensor = pressureSensor !== undefined
  const isPending = sensorsPending || (hasSensor && latestQuery.isPending)

  return (
    <div
      className="w-full flex flex-col overflow-hidden rounded-xl border border-border lg:h-full"
      style={{
        background:
          "linear-gradient(160deg, var(--color-card) 0%, rgba(18,39,48,0.6) 100%)",
      }}
    >
      <div className="px-4 pt-4 pb-1.5">
        <div className="font-heading text-base font-medium leading-snug">
          Water level
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Where the water sits right now
        </p>
      </div>
      <div className="flex-1 flex flex-col">
        {!hasSensor && !sensorsPending ? (
          <div className="h-72 md:h-80 lg:flex-1 flex items-center justify-center text-center px-4">
            <p className="text-sm text-muted-foreground">
              No pressure transducer installed on this borehole yet.
            </p>
          </div>
        ) : (
          <div className="h-72 md:h-80 flex items-center justify-center min-h-0 min-w-0 px-2">
            <BoreholeCylinder
              totalDepth={borehole.total_depth}
              criticalLow={borehole.critical_low_level}
              optimalHigh={borehole.optimal_high_level}
              currentLevel={currentLevel}
              isPending={isPending}
            />
          </div>
        )}
        {latest && (
          <p className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground text-center pb-3 [font-variant-numeric:tabular-nums]">
            As of {formatShortTs(latest.captured_at)}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Fixed-height chart card. Load-bearing invariants:
 *   - `h-72 md:h-80` gives ResponsiveContainer a definite parent height.
 *   - `overflow-hidden` clips any layout thrash during resize.
 *   - `min-h-0 min-w-0` on the card AND on the CardContent stops the
 *     ratcheting bug where Recharts' ResponsiveContainer measures its
 *     own dimensions and the grid grows on every layout pass.
 * Do NOT remove min-h-0 / min-w-0 even though the dashboard now scrolls.
 */
function ChartCard({
  title,
  subtitle,
  viewHref,
  legend,
  stretch,
  children,
}: {
  title: string
  subtitle?: string
  viewHref?: string
  legend?: React.ReactNode
  stretch?: boolean
  children: React.ReactNode
}) {
  return (
    <Card className={cn(
      "w-full flex flex-col overflow-hidden min-h-0 min-w-0",
      stretch ? "h-full" : "h-72 md:h-80",
    )}>
      <CardHeader className="shrink-0">
        <div className="w-full flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="font-heading text-xl">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {viewHref && (
            <Link
              to={viewHref}
              className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors duration-150 whitespace-nowrap"
            >
              View history →
            </Link>
          )}
        </div>
      </CardHeader>
      {legend && (
        <div className="px-4 pb-3 -mt-2">{legend}</div>
      )}
      <CardContent className="flex-1 flex flex-col min-h-0 min-w-0">
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Chart bodies ────────────────────────────────────────────────────────────

function WaterLevelOverviewBody({
  boreholeId,
  sensor,
  sensorsPending,
  criticalLow,
  optimalHigh,
}: {
  boreholeId: number | undefined
  sensor: SensorPublic | undefined
  sensorsPending: boolean
  criticalLow: number
  optimalHigh: number
}) {
  const chartQuery = useWaterLevelChart(boreholeId, sensor?.id, "day")
  return (
    <OverviewChartArea
      hasSensor={sensor !== undefined}
      sensorsPending={sensorsPending}
      chartPending={chartQuery.isPending}
      chartError={chartQuery.isError}
      errorMessage={
        chartQuery.error instanceof ApiError
          ? chartQuery.error.message
          : "Couldn't load readings."
      }
      onRetry={() => chartQuery.refetch()}
      data={chartQuery.data}
      missingSensorText="No pressure transducer on this borehole."
      emptyText="No water-level readings for the last 24 hours."
      render={(points) => (
        <WaterLevelChart
          points={points}
          range="day"
          criticalLow={criticalLow}
          optimalHigh={optimalHigh}
        />
      )}
    />
  )
}

function FlowOverviewBody({
  boreholeId,
  sensor,
  sensorsPending,
}: {
  boreholeId: number | undefined
  sensor: SensorPublic | undefined
  sensorsPending: boolean
}) {
  const chartQuery = useFlowChart(boreholeId, sensor?.id, "day")
  return (
    <OverviewChartArea
      hasSensor={sensor !== undefined}
      sensorsPending={sensorsPending}
      chartPending={chartQuery.isPending}
      chartError={chartQuery.isError}
      errorMessage={
        chartQuery.error instanceof ApiError
          ? chartQuery.error.message
          : "Couldn't load readings."
      }
      onRetry={() => chartQuery.refetch()}
      data={chartQuery.data}
      missingSensorText="No flow meter on this borehole."
      emptyText="No flow readings for the last 24 hours."
      render={(points) => <FlowChart points={points} range="day" />}
    />
  )
}

function PredictionsOverviewBody({
  boreholeId,
  criticalLow,
  optimalHigh,
}: {
  boreholeId: number | undefined
  criticalLow: number
  optimalHigh: number
}) {
  const chartQuery = usePredictionChart(boreholeId, "day")
  return (
    <PredictionOverviewChartArea
      pending={chartQuery.isPending}
      error={chartQuery.isError}
      errorMessage={
        chartQuery.error instanceof ApiError
          ? chartQuery.error.message
          : "Couldn't load predictions."
      }
      onRetry={() => chartQuery.refetch()}
      data={chartQuery.data}
      render={(points) => (
        <PredictionChart
          points={points}
          range="day"
          criticalLow={criticalLow}
          optimalHigh={optimalHigh}
        />
      )}
    />
  )
}

function PredictionOverviewChartArea({
  pending,
  error,
  errorMessage,
  onRetry,
  data,
  render,
}: {
  pending: boolean
  error: boolean
  errorMessage: string
  onRetry: () => void
  data: PredictionChartPoint[] | undefined
  render: (points: PredictionChartPoint[]) => React.ReactNode
}) {
  if (pending) {
    return <Skeleton className="flex-1 min-h-0 min-w-0 w-full" />
  }
  if (error) {
    return (
      <div className="flex flex-col gap-3 items-start">
        <p className="text-destructive text-sm">{errorMessage}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center text-center">
        <p className="text-muted-foreground text-sm max-w-xs">
          No predictions yet — the model needs enough historical readings
          to backfill this borehole.
        </p>
      </div>
    )
  }
  return (
    <div className="flex-1 w-full min-h-0 min-w-0">{render(data)}</div>
  )
}

function OverviewChartArea({
  hasSensor,
  sensorsPending,
  chartPending,
  chartError,
  errorMessage,
  onRetry,
  data,
  missingSensorText,
  emptyText,
  render,
}: {
  hasSensor: boolean
  sensorsPending: boolean
  chartPending: boolean
  chartError: boolean
  errorMessage: string
  onRetry: () => void
  data: ChartPoint[] | undefined
  missingSensorText: string
  emptyText: string
  render: (points: ChartPoint[]) => React.ReactNode
}) {
  if (sensorsPending || (hasSensor && chartPending)) {
    return <Skeleton className="flex-1 min-h-0 min-w-0 w-full" />
  }
  if (!hasSensor) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center text-center">
        <p className="text-muted-foreground text-sm max-w-xs">
          {missingSensorText}
        </p>
      </div>
    )
  }
  if (chartError) {
    return (
      <div className="flex flex-col gap-3 items-start">
        <p className="text-destructive text-sm">{errorMessage}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center text-center">
        <p className="text-muted-foreground text-sm max-w-xs">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="flex-1 w-full min-h-0 min-w-0">
      {render(data)}
    </div>
  )
}

// ─── Gate / empty states ─────────────────────────────────────────────────────

function LocationGate({
  locationsPending,
  hasLocation,
  locationSelected,
  boreholesPending,
  boreholesError,
  onRetryBoreholes,
  boreholesInLocation,
  children,
}: {
  locationsPending: boolean
  hasLocation: boolean
  locationSelected: boolean
  boreholesPending: boolean
  boreholesError: string | null
  onRetryBoreholes: () => void
  boreholesInLocation: Borehole[]
  children: React.ReactNode
}) {
  if (locationsPending) {
    return <Skeleton className="h-96 w-full" />
  }
  if (!hasLocation) {
    return (
      <EmptyBlock text="Create a location and add a borehole to see the dashboard come alive." />
    )
  }
  if (!locationSelected) return null
  if (boreholesError) {
    return (
      <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
        <p className="text-destructive">{boreholesError}</p>
        <Button variant="outline" onClick={onRetryBoreholes}>
          Try again
        </Button>
      </div>
    )
  }
  if (boreholesPending) {
    return <Skeleton className="h-96 w-full" />
  }
  if (boreholesInLocation.length === 0) {
    return (
      <EmptyBlock text="This location has no boreholes yet. Add one to start monitoring." />
    )
  }
  return <>{children}</>
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center flex items-center justify-center">
      <p className="text-muted-foreground text-sm max-w-prose mx-auto">
        {text}
      </p>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numOrUndef(v: string | null): number | undefined {
  if (v === null || v === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function formatShortTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatVolume(litres: number): string {
  return Math.round(litres).toLocaleString()
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins.toFixed(0)} min`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins - h * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmt(v: number | null | undefined, digits: number): string {
  if (v === null || v === undefined) return "—"
  return v.toFixed(digits)
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

