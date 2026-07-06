import { Link, useParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useLocation } from "@/locations/queries"
import { BoreholesPanel } from "@/boreholes/BoreholesPanel"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function LocationDetailPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const id = rawId !== undefined ? Number(rawId) : undefined
  const idIsValid = id !== undefined && !Number.isNaN(id)

  const query = useLocation(idIsValid ? id : undefined)

  return (
    <section className="flex flex-col gap-8">
      <nav>
        <Link
          to="/locations"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 inline-flex items-center gap-1.5"
        >
          <span aria-hidden>←</span> All locations
        </Link>
      </nav>

      {!idIsValid && (
        <p className="text-destructive">That location id doesn't look right.</p>
      )}

      {idIsValid && query.isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      )}

      {idIsValid && query.isError && (
        <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
          <p className="text-destructive">
            {query.error instanceof ApiError
              ? query.error.message
              : "Couldn't load this location."}
          </p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {query.data && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <header className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Location
            </p>
            <h1 className="text-5xl font-medium">{query.data.name}</h1>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Metric label="Latitude" value={query.data.latitude?.toFixed(4) ?? "—"} />
            <Metric label="Longitude" value={query.data.longitude?.toFixed(4) ?? "—"} />
          </div>

          {query.data.id !== null && query.data.id !== undefined && (
            <BoreholesPanel
              locationId={query.data.id}
              locationName={query.data.name}
            />
          )}
        </div>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-2xl [font-variant-numeric:tabular-nums] ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
