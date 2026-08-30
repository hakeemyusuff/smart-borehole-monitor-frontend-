import { Link } from "react-router-dom"
import { usePump } from "@/pump/queries"
import type { PumpStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Compact pump summary for BoreholeDetailPage. Just enough context to
 * see whether a pump is installed and what state it's in; every real
 * action (install, toggle, history, runs) lives on /pump.
 */
export function PumpSummaryCard({ boreholeId }: { boreholeId: number }) {
  const query = usePump(boreholeId)
  const href = `/pump?borehole=${boreholeId}`

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="w-full flex items-start justify-between gap-4 flex-wrap">
          <CardTitle className="font-heading text-xl">Pump</CardTitle>
          {query.data && <StatusPill status={query.data.status} />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isPending ? (
          <Skeleton className="h-5 w-40" />
        ) : query.data ? (
          <p className="text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
            {query.data.power_rating} kW · installed at {query.data.depth} m
            {query.data.last_status_change && (
              <> · since {formatShortTs(query.data.last_status_change)}</>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground max-w-prose">
            No pump on this borehole yet. Install one to unlock scheduling
            and manual control.
          </p>
        )}
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to={href}>
            {query.data ? "Open pump control" : "Install pump"} →
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function StatusPill({ status }: { status: PumpStatus }) {
  if (status === "on") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
        <span
          className="size-1.5 rounded-full bg-primary animate-pulse"
          aria-hidden
        />
        ON
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/70" aria-hidden />
      OFF
    </span>
  )
}

function formatShortTs(iso: string): string {
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
