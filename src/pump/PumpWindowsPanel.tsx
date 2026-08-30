import { ApiError } from "@/lib/api"
import { usePumpWindows } from "@/pump/queries"
import { pumpWindowFormat } from "@/pump/LatestPumpWindowTile"
import type { PumpWindow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Full list of pump windows for a borehole, rendered as a table below
 * PumpHistoryPanel. No pagination — this project won't exceed a few
 * dozen rows in practice.
 */
export function PumpWindowsPanel({ boreholeId }: { boreholeId: number }) {
  const query = usePumpWindows(boreholeId)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Pump windows
        </p>
        <h2 className="text-2xl font-heading font-medium">Runs</h2>
      </header>

      {query.isPending && <TableSkeleton />}

      {query.isError && (
        <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
          <p className="text-destructive text-sm">
            {query.error instanceof ApiError
              ? query.error.message
              : "Couldn't load pump windows."}
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center">
          <p className="text-muted-foreground text-sm">
            No pump runs recorded yet.
          </p>
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="w-full overflow-x-auto rounded-xl border border-border/70">
          <WindowsTable items={query.data} />
        </div>
      )}
    </section>
  )
}

function WindowsTable({ items }: { items: PumpWindow[] }) {
  return (
    <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
      <thead className="bg-secondary text-muted-foreground text-xs uppercase tracking-[0.14em]">
        <tr>
          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
            Start
          </th>
          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
            End
          </th>
          <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">
            Duration
          </th>
          <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">
            Volume
          </th>
          <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">
            Avg rate (L/min)
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((r, i) => (
          <tr
            key={`${r.start}-${i}`}
            className="border-t border-border/60 hover:bg-secondary/20 transition-colors"
          >
            <td className="px-4 py-2.5 whitespace-nowrap text-foreground">
              {formatFullTs(r.start)}
            </td>
            <td className="px-4 py-2.5 whitespace-nowrap text-foreground">
              {formatFullTs(r.end)}
            </td>
            <td className="px-4 py-2.5 text-right whitespace-nowrap text-foreground">
              {pumpWindowFormat.duration(r.duration_min)}
            </td>
            <td className="px-4 py-2.5 text-right whitespace-nowrap text-foreground">
              {pumpWindowFormat.volume(r.volume_litres)}
            </td>
            <td className="px-4 py-2.5 text-right whitespace-nowrap text-foreground">
              {r.avg_rate.toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}

function formatFullTs(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
