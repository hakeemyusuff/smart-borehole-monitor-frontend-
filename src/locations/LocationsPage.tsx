import { Link } from "react-router-dom"
import { ApiError } from "@/lib/api"
import type { Location } from "@/lib/types"
import { useLocations } from "@/locations/queries"
import { NewLocationDialog } from "@/locations/NewLocationDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function LocationsPage() {
  const query = useLocations()

  return (
    <section className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Sites
          </p>
          <h1 className="text-4xl font-medium">Locations</h1>
        </div>
        <NewLocationDialog trigger={<Button>+ New location</Button>} />
      </header>

      {query.isPending && <LocationsSkeletonGrid />}
      {query.isError && <LocationsError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && <LocationsEmpty />}
      {query.data && query.data.length > 0 && <LocationsGrid locations={query.data} />}
    </section>
  )
}

function LocationsGrid({ locations }: { locations: Location[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((loc, i) => (
        <div
          key={loc.id ?? loc.name}
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
        >
          <LocationCard location={loc} />
        </div>
      ))}
    </div>
  )
}

function LocationCard({ location }: { location: Location }) {
  const hasCoords =
    location.latitude !== null &&
    location.latitude !== undefined &&
    location.longitude !== null &&
    location.longitude !== undefined

  return (
    <Link
      to={location.id !== null && location.id !== undefined ? `/locations/${location.id}` : "#"}
      className="group block focus-visible:outline-none"
    >
      <Card className="h-full transition-[transform,box-shadow,border-color] duration-200 will-change-transform group-hover:scale-[1.02] group-hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-black/30 group-focus-visible:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-ring/40">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-medium">
            {location.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
          {hasCoords ? (
            <>
              <span>
                <span className="text-foreground">{location.latitude?.toFixed(4)}</span>
                <span className="mx-1">·</span>
                <span className="text-foreground">{location.longitude?.toFixed(4)}</span>
              </span>
            </>
          ) : (
            <span>No coordinates on file</span>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function LocationsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function LocationsEmpty() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 border border-dashed border-border rounded-xl p-10 flex flex-col items-center text-center gap-4 bg-card/40">
      <BoreholeGlyph />
      <div className="flex flex-col gap-1 max-w-sm">
        <h2 className="text-2xl">No locations yet</h2>
        <p className="text-muted-foreground text-sm">
          A location is a site on a map — boreholes and sensors live inside one. Create your first
          to start monitoring.
        </p>
      </div>
      <NewLocationDialog trigger={<Button>+ Create your first location</Button>} />
    </div>
  )
}

function LocationsError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const message =
    error instanceof ApiError ? error.message : "Couldn't reach the server."
  return (
    <div className="border border-destructive/40 rounded-xl p-8 flex flex-col items-start gap-4 bg-destructive/5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl text-destructive">Couldn't load locations</h2>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function BoreholeGlyph() {
  return (
    <svg width={56} height={56} viewBox="0 0 48 48" aria-hidden>
      <rect
        x={16}
        y={4}
        width={16}
        height={40}
        rx={4}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.25}
        opacity={0.6}
      />
      <path
        d="M 16 26 L 16 40 A 4 4 0 0 0 20 44 L 28 44 A 4 4 0 0 0 32 40 L 32 26 Z"
        fill="var(--primary)"
        fillOpacity={0.75}
      />
    </svg>
  )
}
