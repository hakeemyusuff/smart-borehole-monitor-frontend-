import { ApiError } from "@/lib/api"
import { usePump } from "@/pump/queries"
import { NewPumpDialog } from "@/pump/NewPumpDialog"
import type { Pump } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Borehole-detail-page pump section. Shows current pump specs when one
 * is installed, or an install affordance when none is. Toggle lives on
 * the dashboard, not here — this panel is for administration.
 */
export function PumpPanel({ boreholeId }: { boreholeId: number }) {
  const query = usePump(boreholeId)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Pump
          </p>
          <h2 className="text-2xl font-heading font-medium">Installation</h2>
        </div>
        {query.data && query.data.id !== null && query.data.id !== undefined ? (
          <StatusChip status={query.data.status} />
        ) : (
          !query.isPending && (
            <NewPumpDialog
              boreholeId={boreholeId}
              trigger={<Button size="sm">+ Install pump</Button>}
            />
          )
        )}
      </header>

      {query.isPending && <Skeleton className="h-24 w-full" />}

      {query.isError && (
        <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
          <p className="text-destructive text-sm">
            {query.error instanceof ApiError
              ? query.error.message
              : "Couldn't load pump."}
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!query.isPending && !query.isError && !query.data && (
        <EmptyBlock text="No pump on this borehole yet. Install one to unlock scheduling and manual control from the dashboard." />
      )}

      {query.data && (
        <PumpSpecs pump={query.data} />
      )}
    </section>
  )
}

function PumpSpecs({ pump }: { pump: Pump }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
      <Spec label="Power" value={`${pump.power_rating}`} unit="kW" />
      <Spec label="Installed at" value={`${pump.depth}`} unit="m" />
      <Spec
        label="Since"
        value={pump.last_status_change ? relative(pump.last_status_change) : "—"}
      />
    </div>
  )
}

function Spec({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate">
        {label}
      </span>
      <span className="text-lg text-foreground [font-variant-numeric:tabular-nums] truncate">
        {value}
        {unit && (
          <span className="text-muted-foreground text-sm ml-1">{unit}</span>
        )}
      </span>
    </div>
  )
}

function StatusChip({ status }: { status: "on" | "off" }) {
  if (status === "on") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
        <span
          className="size-1.5 rounded-full bg-primary animate-pulse"
          aria-hidden
        />
        ON
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/70" aria-hidden />
      OFF
    </span>
  )
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-8 text-center">
      <p className="text-muted-foreground text-sm max-w-prose mx-auto">
        {text}
      </p>
    </div>
  )
}

function relative(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
