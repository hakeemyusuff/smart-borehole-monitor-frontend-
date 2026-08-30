import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useBoreholes } from "@/boreholes/queries"
import { useLocations } from "@/locations/queries"
import { usePump } from "@/pump/queries"
import { PumpControlCard } from "@/pump/PumpControlCard"
import { LatestPumpWindowTile } from "@/pump/LatestPumpWindowTile"
import { PumpHistoryPanel } from "@/pump/PumpHistoryPanel"
import { PumpWindowsPanel } from "@/pump/PumpWindowsPanel"
import { NewPumpDialog } from "@/pump/NewPumpDialog"
import type { Borehole } from "@/lib/types"
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
import { cn } from "@/lib/utils"

type PumpTab = "transitions" | "runs"

/**
 * Top-level Pump page. Locked viewport on lg+ (like Data logs) so only
 * the selected table scrolls internally instead of the whole page.
 * Selectors sit inline with the page title (right side) and Transitions
 * / Runs are a tab switch below the control cards — no more long
 * scroll through stacked panels.
 */
export function PumpPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<PumpTab>("transitions")
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

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-6 overflow-y-auto lg:overflow-hidden min-w-0">
      <header className="shrink-0 flex items-end justify-between gap-4 flex-wrap mb-4 md:mb-6">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Pump
          </p>
          <h1 className="text-3xl md:text-4xl font-medium">Control</h1>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <SelectorField label="Location">
            <Select
              value={locationId !== undefined ? String(locationId) : undefined}
              onValueChange={(v) =>
                setParams((p) => {
                  p.set("location", v)
                  p.delete("borehole")
                  return p
                })
              }
              disabled={
                locationsQuery.isPending ||
                (locationsQuery.data ?? []).length === 0
              }
            >
              <SelectTrigger className="w-full sm:w-48">
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
                  return p
                })
              }
              disabled={
                locationId === undefined ||
                boreholesQuery.isPending ||
                boreholesInLocation.length === 0
              }
            >
              <SelectTrigger className="w-full sm:w-48">
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
        </div>
      </header>

      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <SelectionGate
          locationsPending={locationsQuery.isPending}
          hasAnyLocation={(locationsQuery.data ?? []).length > 0}
          locationSelected={locationId !== undefined}
          boreholesPending={boreholesQuery.isPending}
          hasBoreholes={boreholesInLocation.length > 0}
        >
          {boreholeId !== undefined && (
            <PumpBody boreholeId={boreholeId} tab={tab} setTab={setTab} />
          )}
        </SelectionGate>
      </div>
    </div>
  )
}

function PumpBody({
  boreholeId,
  tab,
  setTab,
}: {
  boreholeId: number
  tab: PumpTab
  setTab: (t: PumpTab) => void
}) {
  const query = usePump(boreholeId)

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!query.data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="w-full flex items-start justify-between gap-4 flex-wrap">
            <CardTitle className="font-heading text-xl">
              No pump installed
            </CardTitle>
            <NewPumpDialog
              boreholeId={boreholeId}
              trigger={<Button size="sm">+ Install pump</Button>}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground max-w-prose">
            Register the physical pump on this borehole to unlock manual
            control and start recording pump events.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-in fade-in duration-300 lg:flex-1 lg:min-h-0 lg:min-w-0">
      {/* Control + latest run, static above the tabbed table. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <PumpControlCard boreholeId={boreholeId} />
        <LatestPumpWindowTile boreholeId={boreholeId} />
      </div>

      {/* Tab bar. */}
      <div className="shrink-0">
        <TabBar tab={tab} onChange={setTab} />
      </div>

      {/* Only the selected table renders — makes the page feel focused
          instead of stacking two long lists. lg+ locks the panel to
          fill the remaining space so the table body scrolls with a
          sticky thead. */}
      <div className="flex flex-col lg:flex-1 lg:min-h-0 lg:min-w-0">
        {tab === "transitions" ? (
          <PumpHistoryPanel boreholeId={boreholeId} hideHeader />
        ) : (
          <PumpWindowsPanel boreholeId={boreholeId} hideHeader />
        )}
      </div>
    </div>
  )
}

function TabBar({
  tab,
  onChange,
}: {
  tab: PumpTab
  onChange: (t: PumpTab) => void
}) {
  const OPTIONS: { value: PumpTab; label: string }[] = [
    { value: "transitions", label: "Transitions" },
    { value: "runs", label: "Runs" },
  ]
  return (
    <div
      role="tablist"
      aria-label="Pump records"
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
    >
      {OPTIONS.map((opt) => {
        const isActive = tab === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors duration-150 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SelectionGate({
  locationsPending,
  hasAnyLocation,
  locationSelected,
  boreholesPending,
  hasBoreholes,
  children,
}: {
  locationsPending: boolean
  hasAnyLocation: boolean
  locationSelected: boolean
  boreholesPending: boolean
  hasBoreholes: boolean
  children: React.ReactNode
}) {
  if (locationsPending) return <Skeleton className="h-64 w-full" />
  if (!hasAnyLocation) {
    return (
      <EmptyBlock text="Create a location and add a borehole to manage its pump." />
    )
  }
  if (!locationSelected) return null
  if (boreholesPending) return <Skeleton className="h-64 w-full" />
  if (!hasBoreholes) {
    return (
      <EmptyBlock text="This location has no boreholes yet. Add one before installing a pump." />
    )
  }
  return <>{children}</>
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

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center">
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
