import { useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useLocations } from "@/locations/queries"
import { useBoreholes } from "@/boreholes/queries"
import { useSensorsForBorehole } from "@/sensors/queries"
import { useReadingsPage } from "@/data-logs/queries"
import { useFlowChart, useWaterLevelChart } from "@/readings/queries"
import { WaterLevelChart } from "@/readings/WaterLevelChart"
import { FlowChart } from "@/readings/FlowChart"
import { BoreholeCylinder } from "@/dashboard/BoreholeCylinder"
import { PumpStatusTile } from "@/dashboard/PumpStatusTile"
import type { Borehole, ChartPoint, Location, SensorPublic } from "@/lib/types"
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
    // Root screen lock. Fills the height AppLayout hands us; scrolls on
    // narrow viewports where the strict grid would crush content, locks
    // entirely at lg+ per the layout spec.
    <div className="h-full w-full flex flex-col p-4 md:p-6 overflow-y-auto lg:overflow-hidden min-w-0">
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
    // Widget grid workspace. min-h-0/min-w-0 are load-bearing: they stop
    // Recharts' ResponsiveContainer from ratcheting the grid width larger
    // on every resize (the classic Chrome overflow trap).
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 lg:flex-1 lg:min-h-0 lg:min-w-0 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 min-w-0 lg:col-span-4 lg:h-full lg:min-h-0">
        <CylinderCard
          borehole={borehole}
          boreholeId={boreholeId}
          pressureSensor={pressureSensor}
          sensorsPending={sensorsQuery.isPending}
        />
        <PumpStatusTile />
      </div>

      <div className="flex flex-col gap-4 min-w-0 lg:col-span-8 lg:grid lg:grid-rows-2 lg:h-full lg:min-h-0 lg:min-w-0">
        <ChartCard title="Water level (24h)">
          <WaterLevelOverviewBody
            boreholeId={boreholeId}
            sensor={pressureSensor}
            sensorsPending={sensorsQuery.isPending}
            criticalLow={borehole.critical_low_level}
            optimalHigh={borehole.optimal_high_level}
          />
        </ChartCard>
        <ChartCard title="Flow (24h)">
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
    <Card className="w-full flex flex-col overflow-hidden lg:flex-1 lg:min-h-0 lg:min-w-0">
      <CardHeader className="shrink-0">
        <div className="w-full flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="font-heading text-xl">Water level</CardTitle>
            <p className="text-xs text-muted-foreground">
              Latest reading from the pressure transducer.
            </p>
          </div>
          {currentLevel !== null && (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Latest
              </span>
              <span className="text-2xl [font-variant-numeric:tabular-nums] text-foreground">
                {currentLevel.toFixed(2)}
                <span className="text-muted-foreground text-base ml-1">m</span>
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 min-w-0 flex flex-col">
        {!hasSensor && !sensorsPending ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              No pressure transducer installed on this borehole yet.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 min-w-0 h-64 lg:h-auto flex items-center justify-center">
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
          <p className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground text-center mt-3 [font-variant-numeric:tabular-nums]">
            As of {formatShortTs(latest.created_at)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="w-full flex flex-col overflow-hidden lg:h-full lg:min-h-0 lg:min-w-0">
      <CardHeader className="shrink-0">
        <CardTitle className="font-heading text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 min-w-0 flex flex-col">
        {children}
      </CardContent>
    </Card>
  )
}

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
    return <Skeleton className="flex-1 min-h-0 min-w-0 h-56 lg:h-auto w-full" />
  }
  if (!hasSensor) {
    return (
      <div className="flex-1 min-h-0 min-w-0 h-56 lg:h-auto flex items-center justify-center text-center">
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
      <div className="flex-1 min-h-0 min-w-0 h-56 lg:h-auto flex items-center justify-center text-center">
        <p className="text-muted-foreground text-sm max-w-xs">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="flex-1 min-h-0 min-w-0 w-full h-56 lg:h-auto">
      {render(data)}
    </div>
  )
}

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
    return <Skeleton className="lg:flex-1 lg:min-h-0 h-96 w-full" />
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
    return <Skeleton className="lg:flex-1 lg:min-h-0 h-96 w-full" />
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
    <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center lg:flex-1 lg:min-h-0 flex items-center justify-center">
      <p className="text-muted-foreground text-sm max-w-prose mx-auto">{text}</p>
    </div>
  )
}

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
