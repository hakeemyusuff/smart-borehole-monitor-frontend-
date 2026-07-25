import { useState } from "react"
import { ApiError } from "@/lib/api"
import { usePumpHistoryPage } from "@/pump/queries"
import type { PumpAction, PumpHistory, PumpTrigger } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const PAGE_SIZE = 25

/**
 * Rendered on the BoreholeDetailPage below the sensors panel. Same
 * newest-first + skip/limit pagination pattern as the readings tables.
 */
export function PumpHistoryPanel({ boreholeId }: { boreholeId: number }) {
  const [skip, setSkip] = useState(0)
  const query = usePumpHistoryPage(boreholeId, skip, PAGE_SIZE)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Pump history
        </p>
        <h2 className="text-2xl font-heading font-medium">Transitions</h2>
      </header>

      {query.isPending && <HistorySkeleton />}

      {query.isError && (
        <div className="border border-destructive/40 rounded-xl p-6 flex flex-col items-start gap-3 bg-destructive/5">
          <p className="text-destructive text-sm">
            {query.error instanceof ApiError
              ? query.error.message
              : "Couldn't load pump history."}
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {query.data && query.data.items.length === 0 && (
        <div className="rounded-xl border border-border/70 bg-card/40 p-10 text-center">
          <p className="text-muted-foreground text-sm">
            No pump events recorded yet.
          </p>
        </div>
      )}

      {query.data && query.data.items.length > 0 && (
        <>
          <div className="w-full overflow-x-auto rounded-xl border border-border/70">
            <HistoryTable items={query.data.items} />
          </div>
          <Pagination
            offset={query.data.offset}
            shown={query.data.items.length}
            total={query.data.total}
            skip={skip}
            onPageChange={setSkip}
          />
        </>
      )}
    </section>
  )
}

function HistoryTable({ items }: { items: PumpHistory[] }) {
  return (
    <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
      <thead className="bg-secondary text-muted-foreground text-xs uppercase tracking-[0.14em]">
        <tr>
          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
            Timestamp
          </th>
          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
            Action
          </th>
          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
            Triggered by
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((r, i) => (
          <tr
            key={r.id ?? i}
            className="border-t border-border/60 hover:bg-secondary/20 transition-colors"
          >
            <td className="px-4 py-2.5 whitespace-nowrap text-foreground">
              {formatTs(r.created_at)}
            </td>
            <td className="px-4 py-2.5 whitespace-nowrap">
              <ActionText action={r.action} />
            </td>
            <td className="px-4 py-2.5 whitespace-nowrap">
              <TriggerBadge trigger={r.triggered_by} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ActionText({ action }: { action: PumpAction }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <span
        className={
          action === "turned_on"
            ? "size-1.5 rounded-full bg-primary"
            : "size-1.5 rounded-full bg-muted-foreground/70"
        }
        aria-hidden
      />
      {action === "turned_on" ? "Turned on" : "Turned off"}
    </span>
  )
}

function TriggerBadge({ trigger }: { trigger: PumpTrigger }) {
  const meta = TRIGGER_META[trigger]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

const TRIGGER_META: Record<
  PumpTrigger,
  { label: string; className: string }
> = {
  automatic_schedule: {
    label: "Automatic",
    className: "bg-secondary text-muted-foreground",
  },
  manual_override: {
    label: "Manual",
    className: "bg-primary/15 text-primary",
  },
  critical_safety: {
    label: "Safety",
    className: "bg-destructive/15 text-destructive",
  },
}

function Pagination({
  offset,
  shown,
  total,
  skip,
  onPageChange,
}: {
  offset: number
  shown: number
  total: number
  skip: number
  onPageChange: (skip: number) => void
}) {
  const from = offset + 1
  const to = offset + shown
  const canPrev = offset > 0
  const canNext = offset + shown < total
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
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
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
