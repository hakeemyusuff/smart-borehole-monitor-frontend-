import { useMemo } from "react"
import { ApiError } from "@/lib/api"
import { useWeatherSeries } from "@/weather/queries"
import { HumidityIcon, RainIcon, TempIcon } from "@/weather/icons"
import type { Weather } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Compact conditions card. Always renders the "Weather" header so the
 * tile is identifiable even in pending / empty / error states — an
 * anonymous "Not Found" card is worse than one that says "Weather —
 * no data yet".
 */
export function WeatherStrip({ locationId }: { locationId: number | undefined }) {
  const query = useWeatherSeries(locationId)

  const latest = useMemo<Weather | null>(() => {
    if (!query.data || query.data.length === 0) return null
    // Backend returns ascending — newest is the last element.
    return query.data[query.data.length - 1]
  }, [query.data])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="w-full flex items-start justify-between gap-3">
          <CardTitle className="font-heading text-xl">Weather</CardTitle>
          {latest && (
            <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 [font-variant-numeric:tabular-nums]">
              {formatWhen(latest.created_at)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <WeatherBody
          isPending={query.isPending}
          isError={query.isError}
          error={query.error}
          latest={latest}
        />
      </CardContent>
    </Card>
  )
}

function WeatherBody({
  isPending,
  isError,
  error,
  latest,
}: {
  isPending: boolean
  isError: boolean
  error: unknown
  latest: Weather | null
}) {
  if (isPending) {
    return <Skeleton className="h-10 w-full" />
  }
  if (isError) {
    const msg =
      error instanceof ApiError ? error.message : "Couldn't load weather."
    return <p className="text-xs text-muted-foreground">{msg}</p>
  }
  if (!latest) {
    return (
      <p className="text-xs text-muted-foreground">
        No weather data for this location yet.
      </p>
    )
  }
  return (
    // 3-col grid so the stats stay aligned + readable on narrow widths;
    // was flex-wrap with a sub-14px readout that broke to two rows and
    // looked cramped on mobile.
    <div className="grid grid-cols-3 gap-3 md:gap-6">
      <Stat
        icon={<TempIcon />}
        label="Temp"
        value={fmt(latest.temperature, 1)}
        unit="°C"
      />
      <Stat
        icon={<HumidityIcon />}
        label="Humidity"
        value={fmt(latest.humidity, 0)}
        unit="%"
      />
      <Stat
        icon={<RainIcon />}
        label="Rain"
        value={fmt(latest.precipitation, 1)}
        unit="mm"
      />
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-muted-foreground/80 shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="text-base font-medium text-foreground [font-variant-numeric:tabular-nums] truncate">
          {value}
          <span className="text-muted-foreground text-xs ml-0.5">{unit}</span>
        </span>
      </div>
    </div>
  )
}

function fmt(v: number | null | undefined, digits: number): string {
  if (v === null || v === undefined) return "—"
  return v.toFixed(digits)
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

