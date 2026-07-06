import { Link } from "react-router-dom"
import type { Borehole } from "@/lib/types"
import { ApiError } from "@/lib/api"
import { useBoreholes } from "@/boreholes/queries"
import { NewBoreholeDialog } from "@/boreholes/NewBoreholeDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function BoreholesPanel({
  locationId,
  locationName,
}: {
  locationId: number
  locationName: string
}) {
  const query = useBoreholes()

  const forThisLocation =
    query.data?.filter((b) => b.location_id === locationId) ?? []

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Site
          </p>
          <h2 className="font-heading text-2xl">Boreholes at {locationName}</h2>
        </div>
        <NewBoreholeDialog
          locationId={locationId}
          trigger={<Button size="sm">+ New borehole</Button>}
        />
      </header>

      {query.isPending && <BoreholesSkeleton />}
      {query.isError && (
        <BoreholesError error={query.error} onRetry={() => query.refetch()} />
      )}
      {query.data && forThisLocation.length === 0 && (
        <BoreholesEmpty locationId={locationId} />
      )}
      {query.data && forThisLocation.length > 0 && (
        <BoreholesList boreholes={forThisLocation} />
      )}
    </section>
  )
}

function BoreholesList({ boreholes }: { boreholes: Borehole[] }) {
  return (
    <div className="flex flex-col gap-3">
      {boreholes.map((b, i) => (
        <div
          key={b.id ?? b.name}
          className="animate-in fade-in slide-in-from-bottom-1 duration-500"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
        >
          <BoreholeRow borehole={b} />
        </div>
      ))}
    </div>
  )
}

function BoreholeRow({ borehole }: { borehole: Borehole }) {
  const hasId = borehole.id !== null && borehole.id !== undefined
  return (
    <Link
      to={hasId ? `/boreholes/${borehole.id}` : "#"}
      className="group block focus-visible:outline-none"
    >
      <Card className="w-full transition-[transform,box-shadow,border-color] duration-200 will-change-transform group-hover:scale-[1.01] group-hover:border-primary/50 group-hover:shadow-md group-hover:shadow-black/25 group-focus-visible:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-ring/40">
        <CardContent className="flex items-center justify-between gap-6 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <BoreholeMark depth={borehole.total_depth} />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-heading text-lg truncate">{borehole.name}</span>
              <span className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                {borehole.total_depth}m deep · {borehole.topography}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs [font-variant-numeric:tabular-nums]">
            <span className="text-muted-foreground">Range</span>
            <span className="text-foreground">
              {borehole.critical_low_level}–{borehole.optimal_high_level}m
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function BoreholeMark({ depth }: { depth: number }) {
  // Rough fill proportional to the depth vs. a nominal 60m so shallow and
  // deep boreholes read differently at a glance. Not a real gauge.
  const fillPct = Math.max(15, Math.min(85, (depth / 60) * 80))
  return (
    <svg width={22} height={30} viewBox="0 0 22 30" aria-hidden className="shrink-0">
      <rect
        x={4}
        y={2}
        width={14}
        height={26}
        rx={3.5}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.1}
        opacity={0.65}
      />
      <path
        d={`M 4 ${28 - (26 * fillPct) / 100} L 4 25 A 3.5 3.5 0 0 0 7.5 28.5 L 14.5 28.5 A 3.5 3.5 0 0 0 18 25 L 18 ${28 - (26 * fillPct) / 100} Z`}
        fill="var(--primary)"
        fillOpacity={0.85}
      />
    </svg>
  )
}

function BoreholesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-4"
        >
          <Skeleton className="h-8 w-6" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function BoreholesEmpty({ locationId }: { locationId: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-400 border border-dashed border-border rounded-xl p-8 flex flex-col items-center text-center gap-3 bg-card/40">
      <p className="text-muted-foreground text-sm max-w-sm">
        No boreholes registered at this location yet. Register one to install sensors and start
        capturing readings.
      </p>
      <NewBoreholeDialog
        locationId={locationId}
        trigger={<Button variant="outline">+ Register a borehole</Button>}
      />
    </div>
  )
}

function BoreholesError({
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
          Couldn't load boreholes
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
