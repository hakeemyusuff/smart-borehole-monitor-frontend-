import { useMemo } from "react"
import { ApiError } from "@/lib/api"
import { useWeatherSeries } from "@/weather/queries"
import type { Weather } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Compact conditions strip for the Dashboard's left column. Reads
 * the location's weather series and shows the latest sample as
 * temperature / humidity / precipitation.
 */
export function WeatherStrip({ locationId }: { locationId: number | undefined }) {
  const query = useWeatherSeries(locationId)

  const latest = useMemo<Weather | null>(() => {
    if (!query.data || query.data.length === 0) return null
    // Backend returns ascending — newest is the last element.
    return query.data[query.data.length - 1]
  }, [query.data])

  if (query.isPending) {
    return (
      <Card className="w-full">
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError) {
    const msg =
      query.error instanceof ApiError
        ? query.error.message
        : "Couldn't load weather."
    return (
      <Card className="w-full">
        <CardContent>
          <p className="text-xs text-muted-foreground">{msg}</p>
        </CardContent>
      </Card>
    )
  }

  if (!latest) {
    return (
      <Card className="w-full">
        <CardContent>
          <p className="text-xs text-muted-foreground text-center">
            No weather data for this location yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 md:gap-6 flex-wrap">
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
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 [font-variant-numeric:tabular-nums] shrink-0">
          {formatWhen(latest.created_at)}
        </p>
      </CardContent>
    </Card>
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
      <span className="text-muted-foreground/80" aria-hidden>
        {icon}
      </span>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="text-sm text-foreground [font-variant-numeric:tabular-nums]">
          {value}
          <span className="text-muted-foreground ml-0.5">{unit}</span>
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

function TempIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M 8 2 v 8 M 6 11 a 2 2 0 1 0 4 0 c 0 -1 -1 -1.5 -2 -1.5 s -2 0.5 -2 1.5 z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HumidityIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M 8 2 C 5 6 3.5 8 3.5 10 a 4.5 4.5 0 0 0 9 0 c 0 -2 -1.5 -4 -4.5 -8 z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RainIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M 4 8 h 8 a 2.5 2.5 0 0 0 0 -5 h -0.3 A 3.5 3.5 0 0 0 5 4 a 2.5 2.5 0 0 0 -1 4 z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path
        d="M 6 11 l -1 2 M 9 11 l -1 2 M 12 11 l -1 2"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </svg>
  )
}
