import { ApiError } from "@/lib/api"
import { usePumpWindows } from "@/pump/queries"
import type { PumpWindow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Compact dashboard tile showing the most recent pump window: volume
 * pumped, duration, avg rate, and start time. Reads the sorted list from
 * usePumpWindows and shows items[0].
 */
export function LatestPumpWindowTile({
  boreholeId,
}: {
  boreholeId: number
}) {
  const query = usePumpWindows(boreholeId)

  if (query.isPending) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Latest pump run</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Latest pump run</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {query.error instanceof ApiError
              ? query.error.message
              : "Couldn't load pump windows."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const latest = query.data?.[0]

  if (!latest) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Latest pump run</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No pump runs recorded yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="w-full flex items-start justify-between gap-4">
          <CardTitle className="font-heading text-xl">
            Latest pump run
          </CardTitle>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground [font-variant-numeric:tabular-nums] shrink-0">
            {formatShortTs(latest.start)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className="text-2xl [font-variant-numeric:tabular-nums] text-foreground">
            {formatVolume(latest.volume_litres)}
          </span>
          <span className="text-xs text-muted-foreground">litres pumped</span>
        </p>
        <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          {formatDuration(latest.duration_min)} · {latest.avg_rate.toFixed(1)} L/min avg
        </p>
      </CardContent>
    </Card>
  )
}

// Full litres, locale-grouped ("3,098") — no kL shortening, so the tile
// reads unambiguously next to its "litres pumped" label.
function formatVolume(litres: number): string {
  return Math.round(litres).toLocaleString()
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins.toFixed(0)} min`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins - h * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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

// Re-exported so the panel can share the same formatting rules.
export const pumpWindowFormat = {
  volume: formatVolume,
  duration: formatDuration,
  time: formatShortTs,
}

export type { PumpWindow }
