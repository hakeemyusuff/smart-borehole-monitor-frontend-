import { useEffect, useMemo } from "react"
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
import { PageShell } from "@/components/PageShell"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Top-level Pump page. Cascading Location -> Borehole selectors mirror
 * the Data logs pattern; body swaps between install prompt (no pump
 * yet) and full pump surface (control + latest run + history + windows)
 * once one is installed.
 *
 * Selectors are URL-persisted via ?location=&borehole= so the borehole
 * summary card on BoreholeDetailPage can link here with the right
 * scope preselected.
 */
export function PumpPage() {
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

  return (
    <PageShell>
      <section className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Pump
          </p>
          <h1 className="text-3xl md:text-4xl font-medium">Control</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-prose">
            Install and manage the pump on any borehole. Manual overrides
            drive the physical pump — every change is logged in the
            transitions table below.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
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
        </div>

        <SelectionGate
          locationsPending={locationsQuery.isPending}
          hasAnyLocation={(locationsQuery.data ?? []).length > 0}
          locationSelected={locationId !== undefined}
          boreholesPending={boreholesQuery.isPending}
          hasBoreholes={boreholesInLocation.length > 0}
        >
          {boreholeId !== undefined && <PumpBody boreholeId={boreholeId} />}
        </SelectionGate>
      </section>
    </PageShell>
  )
}

function PumpBody({ boreholeId }: { boreholeId: number }) {
  const query = usePump(boreholeId)

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!query.data) {
    // 404 handled inside usePump — data === null means "no pump yet".
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PumpControlCard boreholeId={boreholeId} />
        <LatestPumpWindowTile boreholeId={boreholeId} />
      </div>
      <PumpHistoryPanel boreholeId={boreholeId} />
      <PumpWindowsPanel boreholeId={boreholeId} />
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
