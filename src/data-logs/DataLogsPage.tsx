import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useLocations } from "@/locations/queries"
import { useBoreholes } from "@/boreholes/queries"
import { useSensorsForBorehole } from "@/sensors/queries"
import { useReadingsPage, type ReadingKind } from "@/data-logs/queries"
import { sensorMeta } from "@/sensors/sensor-types"
import type {
  FlowReading,
  SensorPublic,
  WaterLevelReading,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const PAGE_SIZE = 50

export function DataLogsPage() {
  const [params, setParams] = useSearchParams()
  const [skip, setSkip] = useState(0)

  const locationId = numOrUndef(params.get("location"))
  const boreholeId = numOrUndef(params.get("borehole"))
  const sensorId = numOrUndef(params.get("sensor"))

  const locationsQuery = useLocations()
  const boreholesQuery = useBoreholes()
  const sensorsQuery = useSensorsForBorehole(boreholeId)

  const boreholesInLocation = useMemo(() => {
    if (!boreholesQuery.data || locationId === undefined) return []
    return boreholesQuery.data.filter((b) => b.location_id === locationId)
  }, [boreholesQuery.data, locationId])

  const readableSensors = useMemo(
    () => (sensorsQuery.data ?? []).filter((s) => s.type !== "esp32"),
    [sensorsQuery.data],
  )

  useEffect(() => {
    if (
      locationId === undefined &&
      locationsQuery.data &&
      locationsQuery.data.length > 0
    ) {
      const first = locationsQuery.data[0].id
      if (first !== undefined && first !== null) {
        setParams((p) => {
          p.set("location", String(first))
          return p
        })
      }
    }
  }, [locationId, locationsQuery.data, setParams])

  useEffect(() => {
    if (
      locationId !== undefined &&
      boreholeId === undefined &&
      boreholesInLocation.length > 0
    ) {
      const first = boreholesInLocation[0].id
      if (first !== undefined && first !== null) {
        setParams((p) => {
          p.set("borehole", String(first))
          return p
        })
      }
    }
  }, [locationId, boreholeId, boreholesInLocation, setParams])

  useEffect(() => {
    if (
      boreholeId !== undefined &&
      sensorId === undefined &&
      readableSensors.length > 0
    ) {
      setParams((p) => {
        p.set("sensor", String(readableSensors[0].id))
        return p
      })
    }
  }, [boreholeId, sensorId, readableSensors, setParams])

  useEffect(() => {
    setSkip(0)
  }, [sensorId])

  const currentSensor = readableSensors.find((s) => s.id === sensorId)
  const kind: ReadingKind | undefined = currentSensor
    ? currentSensor.type === "flow_meter"
      ? "flow-reading"
      : currentSensor.type === "pressure_transducer"
        ? "water-level"
        : undefined
    : undefined

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-6 overflow-y-auto lg:overflow-hidden min-w-0">
      <header className="shrink-0 mb-6 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Data logs
        </p>
        <h1 className="text-3xl md:text-4xl font-medium">Transmissions</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-prose">
          Raw sensor readings as they arrived. No aggregation, no smoothing —
          the honest counterpart to the charts.
        </p>
      </header>

      <div className="shrink-0 mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <SelectorField label="Location">
          <Select
            value={locationId !== undefined ? String(locationId) : undefined}
            onValueChange={(v) =>
              setParams((p) => {
                p.set("location", v)
                p.delete("borehole")
                p.delete("sensor")
                return p
              })
            }
            disabled={
              locationsQuery.isPending ||
              (locationsQuery.data ?? []).length === 0
            }
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Choose a location" />
            </SelectTrigger>
            <SelectContent>
              {(locationsQuery.data ?? []).map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectorField>

        <SelectorField label="Borehole">
          <Select
            value={boreholeId !== undefined ? String(boreholeId) : undefined}
            onValueChange={(v) =>
              setParams((p) => {
                p.set("borehole", v)
                p.delete("sensor")
                return p
              })
            }
            disabled={
              locationId === undefined ||
              boreholesQuery.isPending ||
              boreholesInLocation.length === 0
            }
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Choose a borehole" />
            </SelectTrigger>
            <SelectContent>
              {boreholesInLocation.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectorField>

        <SelectorField label="Sensor">
          <Select
            value={sensorId !== undefined ? String(sensorId) : undefined}
            onValueChange={(v) =>
              setParams((p) => {
                p.set("sensor", v)
                return p
              })
            }
            disabled={
              boreholeId === undefined ||
              sensorsQuery.isPending ||
              readableSensors.length === 0
            }
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Choose a sensor" />
            </SelectTrigger>
            <SelectContent>
              {readableSensors.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {sensorMeta(s.type).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectorField>
      </div>

      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <SelectionGuard
          locationsPending={locationsQuery.isPending}
          hasAnyLocation={(locationsQuery.data ?? []).length > 0}
          hasBoreholes={boreholesInLocation.length > 0}
          boreholesPending={boreholesQuery.isPending}
          hasReadableSensors={readableSensors.length > 0}
          sensorsPending={sensorsQuery.isPending}
          boreholeSelected={boreholeId !== undefined}
        >
          {currentSensor && kind && boreholeId !== undefined && (
            <ReadingsPanel
              kind={kind}
              boreholeId={boreholeId}
              sensor={currentSensor}
              skip={skip}
              onPageChange={setSkip}
            />
          )}
        </SelectionGuard>
      </div>
    </div>
  )
}

function ReadingsPanel({
  kind,
  boreholeId,
  sensor,
  skip,
  onPageChange,
}: {
  kind: ReadingKind
  boreholeId: number
  sensor: SensorPublic
  skip: number
  onPageChange: (skip: number) => void
}) {
  const query = useReadingsPage(kind, boreholeId, sensor.id, skip, PAGE_SIZE)

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2 lg:flex-1 lg:min-h-0">
        <Skeleton className="h-9 w-full shrink-0" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shrink-0" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
        <p className="text-destructive">
          {query.error instanceof ApiError
            ? query.error.message
            : "Couldn't load transmissions."}
        </p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const { items, total, offset } = query.data
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center lg:flex-1 lg:min-h-0 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No transmissions yet from this sensor.
        </p>
      </div>
    )
  }

  const from = offset + 1
  const to = offset + items.length
  const canPrev = offset > 0
  const canNext = offset + items.length < total

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 lg:flex-1 lg:min-h-0 lg:min-w-0">
      <div className="w-full overflow-x-auto rounded-xl border border-border/70 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
        {kind === "water-level" ? (
          <WaterLevelTable items={items as WaterLevelReading[]} />
        ) : (
          <FlowTable items={items as FlowReading[]} />
        )}
      </div>
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          Showing {from.toLocaleString()}–{to.toLocaleString()} of{" "}
          {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => onPageChange(Math.max(0, skip - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => onPageChange(skip + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function WaterLevelTable({ items }: { items: WaterLevelReading[] }) {
  return (
    <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
      <thead className="bg-secondary text-muted-foreground text-xs uppercase tracking-[0.14em] lg:sticky lg:top-0 lg:z-10">
        <tr>
          <Th>Timestamp</Th>
          <Th align="right">Water level (m)</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((r, i) => (
          <tr
            key={r.id ?? i}
            className="border-t border-border/60 hover:bg-secondary/20 transition-colors"
          >
            <Td>{formatTs(r.created_at)}</Td>
            <Td align="right">{r.water_level.toFixed(3)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FlowTable({ items }: { items: FlowReading[] }) {
  return (
    <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
      <thead className="bg-secondary text-muted-foreground text-xs uppercase tracking-[0.14em] lg:sticky lg:top-0 lg:z-10">
        <tr>
          <Th>Timestamp</Th>
          <Th align="right">Abstraction rate (L/min)</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((r, i) => (
          <tr
            key={r.id ?? i}
            className="border-t border-border/60 hover:bg-secondary/20 transition-colors"
          >
            <Td>{formatTs(r.created_at)}</Td>
            <Td align="right">{r.abstraction_rate.toFixed(3)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <th
      className={
        align === "right"
          ? "px-4 py-2.5 font-medium text-right whitespace-nowrap"
          : "px-4 py-2.5 font-medium text-left whitespace-nowrap"
      }
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <td
      className={
        align === "right"
          ? "px-4 py-2.5 text-right whitespace-nowrap text-foreground"
          : "px-4 py-2.5 text-left whitespace-nowrap text-foreground"
      }
    >
      {children}
    </td>
  )
}

function SelectorField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function SelectionGuard({
  locationsPending,
  hasAnyLocation,
  boreholesPending,
  hasBoreholes,
  sensorsPending,
  hasReadableSensors,
  boreholeSelected,
  children,
}: {
  locationsPending: boolean
  hasAnyLocation: boolean
  boreholesPending: boolean
  hasBoreholes: boolean
  sensorsPending: boolean
  hasReadableSensors: boolean
  boreholeSelected: boolean
  children: React.ReactNode
}) {
  if (locationsPending) {
    return <Skeleton className="h-64 w-full lg:flex-1 lg:min-h-0" />
  }
  if (!hasAnyLocation) {
    return (
      <EmptyBlock text="Create a location first — logs live under sensors." />
    )
  }
  if (boreholesPending) {
    return <Skeleton className="h-64 w-full lg:flex-1 lg:min-h-0" />
  }
  if (!hasBoreholes) {
    return (
      <EmptyBlock text="This location has no boreholes yet. Add one to see its sensors' logs." />
    )
  }
  if (!boreholeSelected) {
    return null
  }
  if (sensorsPending) {
    return <Skeleton className="h-64 w-full lg:flex-1 lg:min-h-0" />
  }
  if (!hasReadableSensors) {
    return (
      <EmptyBlock text="This borehole has no reading sensors. Add a pressure transducer or flow meter to see logs." />
    )
  }
  return <>{children}</>
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center lg:flex-1 lg:min-h-0 flex items-center justify-center">
      <p className="text-muted-foreground text-sm max-w-prose mx-auto">
        {text}
      </p>
    </div>
  )
}

function numOrUndef(v: string | null): number | undefined {
  if (v === null || v === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function formatTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
