import { useId, useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartPoint, ChartRange } from "@/lib/types"
import { useIsNarrow } from "@/lib/useIsNarrow"
import {
  chartTick,
  formatWat,
  volumeTick,
  formatDayLabel,
  formatRuntime,
  type DailyVolumePoint,
} from "./chart-data"

type Point = { t: number; value: number | null }

const DAY_MS = 86_400_000

/**
 * Two chart modes driven by the range:
 *  - "day":   instantaneous abstraction rate (L/min) per recorded sample.
 *             Bars — not a connected line — so idle stretches read as the
 *             gaps they are (no fabricated zeros between pulses).
 *  - "week" / "month": total abstracted VOLUME per calendar day (litres),
 *             aggregated from pump-run windows. Instantaneous rate spikes
 *             are meaningless at that scale — what matters is how much was
 *             pumped each day. Every day of the window is plotted, including
 *             zero-run days, so bars sit on an even axis.
 * Volume data arrives via `dailyVolumes`; without pump windows the volume
 * mode cannot be computed, so callers fall back to a message.
 */
export function FlowChart({
  points,
  range,
  dailyVolumes,
}: {
  points: ChartPoint[]
  range: ChartRange
  /** Required for week/month; ignored for day. */
  dailyVolumes?: DailyVolumePoint[]
}) {
  if (range === "day") return <RateBarChart points={points} />
  if (!dailyVolumes) return <NoVolumeData note="Pump-run data unavailable for this borehole." />
  return <DailyVolumeBarChart data={dailyVolumes} />
}

// ─── Day view: instantaneous rate ────────────────────────────────────────────

function RateBarChart({ points }: { points: ChartPoint[] }) {
  const gradientId = useId()
  const narrow = useIsNarrow()

  const data = useMemo<Point[]>(
    () =>
      points
        .map((p) => ({
          t: Date.parse(p.t),
          value: p.value !== null && Number.isFinite(p.value) ? p.value : null,
        }))
        .filter((p) => Number.isFinite(p.t))
        .sort((a, b) => a.t - b.t),
    [points],
  )

  const yDomain = useMemo<[number, number]>(() => {
    const numeric = data
      .map((d) => d.value)
      .filter((v): v is number => v !== null)
    if (numeric.length === 0) return [0, 1]
    const max = Math.max(...numeric)
    const padding = Math.max(0.5, max * 0.12)
    return [0, max + padding]
  }, [data])

  if (data.length === 0) return null

  const tickFontSize = narrow ? 10 : 11

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: narrow ? 4 : 12, left: 0, bottom: 8 }}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={data.length === 1 ? [data[0].t - 3_600_000, data[0].t + 3_600_000] : ["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => chartTick(ts, "day")}
            stroke="var(--border)"
            tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            minTickGap={narrow ? 32 : 40}
          />
          <YAxis
            stroke="var(--border)"
            tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            width={narrow ? 32 : 44}
            domain={yDomain}
            // Adaptive precision: one decimal when the window's peak stays
            // small so ticks aren't all "0".
            tickFormatter={(v: number) =>
              yDomain[1] <= 2 ? v.toFixed(1) : yDomain[1] <= 10 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(0)
            }
            tickCount={narrow ? 4 : 5}
          />

          <Bar
            dataKey="value"
            name="Recorded flow"
            fill={`url(#${gradientId})`}
            fillOpacity={0.85}
            maxBarSize={32}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            activeBar={
              <Rectangle fill="var(--primary)" fillOpacity={0.95} radius={[4, 4, 0, 0]} />
            }
          />

          <Tooltip
            cursor={{ fill: "var(--primary)", fillOpacity: 0.06 }}
            content={<FlowTooltip range="day" />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Week / Month view: daily abstracted volume ─────────────────────────────

function DailyVolumeBarChart({ data }: { data: DailyVolumePoint[] }) {
  const gradientId = useId()
  const narrow = useIsNarrow()

  const volumes = useMemo(() => data.map((d) => d.volume ?? 0), [data])
  const hasAnyRun = volumes.some((v) => v > 0)
  const tickFontSize = narrow ? 10 : 11

  const yDomain = useMemo<[number, number]>(() => {
    const max = Math.max(...volumes)
    return [0, Math.max(10, max * 1.15)]
  }, [volumes])

  if (data.length === 0) return null

  // Half-day padding either side centres each bar on its calendar-day tick.
  const domain: [number, number] = [data[0].t - DAY_MS / 2, data[data.length - 1].t + DAY_MS / 2]

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: narrow ? 4 : 12, left: 0, bottom: 8 }}
          barCategoryGap="25%"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />

          {/* Ticks are pinned to every day bucket so zero-run days keep
              their slot; recharts thins overlapping labels automatically. */}
          <XAxis
            dataKey="t"
            type="number"
            domain={domain}
            ticks={data.map((d) => d.t)}
            tickFormatter={volumeTick}
            stroke="var(--border)"
            tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            minTickGap={narrow ? 22 : 14}
          />
          <YAxis
            stroke="var(--border)"
            tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            width={narrow ? 34 : 46}
            domain={yDomain}
            tickFormatter={formatLitresTick}
            tickCount={narrow ? 4 : 5}
          />

          <Bar
            dataKey="volume"
            name="Estimated daily abstraction"
            fill={`url(#${gradientId})`}
            fillOpacity={0.9}
            maxBarSize={32}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            activeBar={
              <Rectangle fill="var(--primary)" fillOpacity={0.95} radius={[4, 4, 0, 0]} />
            }
          />

          <Tooltip cursor={{ fill: "var(--primary)", fillOpacity: 0.06 }} content={<VolumeTooltip />} />
        </BarChart>
      </ResponsiveContainer>
      {!hasAnyRun && (
        <p className="text-xs text-muted-foreground text-center -mt-6 pb-1">
          No pump activity recorded in this window.
        </p>
      )}
    </div>
  )
}

/** Compact Y-axis labels: 425 → "425", 1450 → "1.5k", 12000 → "12k". */
function formatLitresTick(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${Math.round(v)}`
}

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: DailyVolumePoint }[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg shadow-black/40 min-w-40">
      <p className="text-xs text-muted-foreground">{formatDayLabel(point.t)}</p>
      {point.volume !== null && point.volume > 0 ? (
        <>
          <p className="mt-1 text-lg text-foreground [font-variant-numeric:tabular-nums]">
            {point.volume.toLocaleString()}{" "}
            <span className="text-xs text-muted-foreground">L</span>
          </p>
          {point.runtimeMin !== null && (
            <p className="text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
              Estimated runtime {formatRuntime(point.runtimeMin)}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No recorded pumping</p>
      )}
    </div>
  )
}

function NoVolumeData({ note }: { note: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-center px-4">
      <p className="text-sm text-muted-foreground max-w-xs">
        Daily volume needs pump-run data. {note}
      </p>
    </div>
  )
}

// ─── Day tooltip ─────────────────────────────────────────────────────────────

type TooltipProps = {
  active?: boolean
  payload?: { payload: Point }[]
  range: ChartRange
}

function FlowTooltip({ active, payload, range }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg shadow-black/40 min-w-40">
      <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
        {formatWat(point.t)}
      </p>
      {point.value !== null ? (
        <p className="mt-1 text-lg text-foreground [font-variant-numeric:tabular-nums]">
          {point.value.toFixed(2)} L/min
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          {range === "day" ? "No recorded flow reading" : "No recorded samples in this bucket"}
        </p>
      )}
    </div>
  )
}
