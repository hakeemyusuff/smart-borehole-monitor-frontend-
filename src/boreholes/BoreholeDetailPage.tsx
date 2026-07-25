import { Link, useParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { useBorehole } from "@/boreholes/queries"
import { SensorsPanel } from "@/sensors/SensorsPanel"
import { PumpHistoryPanel } from "@/pump/PumpHistoryPanel"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/PageShell"
import { Skeleton } from "@/components/ui/skeleton"

export function BoreholeDetailPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const id = rawId !== undefined ? Number(rawId) : undefined
  const idIsValid = id !== undefined && !Number.isNaN(id)

  const query = useBorehole(idIsValid ? id : undefined)

  return (
    <PageShell>
      <section className="flex flex-col gap-8">
      <nav>
        {query.data?.location_id !== null && query.data?.location_id !== undefined ? (
          <Link
            to={`/locations/${query.data.location_id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> Back to location
          </Link>
        ) : (
          <Link
            to="/locations"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> All locations
          </Link>
        )}
      </nav>

      {!idIsValid && (
        <p className="text-destructive">That borehole id doesn't look right.</p>
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
              : "Couldn't load this borehole."}
          </p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {query.data && (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <header className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Borehole
            </p>
            <h1 className="text-5xl font-medium">{query.data.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {query.data.topography[0]?.toUpperCase() + query.data.topography.slice(1)} terrain
              · {query.data.soil_characteristic}
            </p>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
            <Metric
              label="Total depth"
              value={query.data.total_depth}
              unit="m"
            />
            <Metric
              label="Critical low"
              value={query.data.critical_low_level}
              unit="m"
            />
            <Metric
              label="Optimal high"
              value={query.data.optimal_high_level}
              unit="m"
            />
            <Metric
              label="Water body"
              value={query.data.water_body_proximity}
              unit="m"
              subLabel="proximity"
            />
          </div>

          {query.data.id !== null && query.data.id !== undefined && (
            <>
              <SensorsPanel boreholeId={query.data.id} />
              <PumpHistoryPanel boreholeId={query.data.id} />
            </>
          )}
        </div>
      )}
      </section>
    </PageShell>
  )
}

function Metric({
  label,
  value,
  unit,
  subLabel,
}: {
  label: string
  value: number
  unit?: string
  subLabel?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground truncate">
        {label}
      </span>
      <span className="text-2xl [font-variant-numeric:tabular-nums] text-foreground truncate">
        {value}
        {unit && (
          <span className="text-muted-foreground text-base ml-1">{unit}</span>
        )}
      </span>
      {subLabel && (
        <span className="text-xs text-muted-foreground">{subLabel}</span>
      )}
    </div>
  )
}
