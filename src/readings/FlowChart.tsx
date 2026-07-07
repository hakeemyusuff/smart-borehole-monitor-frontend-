import { useId, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartPoint, ChartRange } from "@/lib/types"

type Point = {
  t: number
  value: number | null
}

export function FlowChart({
  points,
  range,
}: {
  points: ChartPoint[]
  range: ChartRange
}) {
  const gradientId = useId()

  const data = useMemo<Point[]>(() => {
    const sorted = points
      .map((p) => ({
        t: new Date(p.t).getTime(),
        value: p.value,
      }))
      .sort((a, b) => a.t - b.t)
    return withGaps(sorted, GAP_MS[range])
  }, [points, range])

  const yDomain = useMemo<[number, number]>(() => {
    const numeric = data
      .map((d) => d.value)
      .filter((v): v is number => v !== null)
    if (numeric.length === 0) return [0, 1]
    const min = Math.min(...numeric)
    const max = Math.max(...numeric)
    const padding = Math.max(1, (max - min) * 0.1)
    return [min - padding, max + padding]
  }, [data])

  if (data.length === 0) return null

  return (
    <div className="w-full h-72 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />

          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => formatTick(ts, range)}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            minTickGap={40}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            width={44}
            domain={yDomain}
            tickFormatter={(v: number) => v.toFixed(0)}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls={false}
            isAnimationActive
            animationDuration={600}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--primary)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />

          <Tooltip
            cursor={{
              stroke: "var(--primary)",
              strokeOpacity: 0.4,
              strokeDasharray: "3 3",
            }}
            content={<FlowTooltip />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Gap threshold per range: consecutive points farther apart than this get a
// null placeholder inserted so the area breaks visually (between-pumping idle).
const GAP_MS: Record<ChartRange, number> = {
  day: 5 * 60 * 1000,
  week: 60 * 60 * 1000,
  month: 6 * 60 * 60 * 1000,
}

function withGaps(points: Point[], threshold: number): Point[] {
  if (points.length < 2) return points
  const out: Point[] = []
  for (let i = 0; i < points.length; i++) {
    out.push(points[i])
    const next = points[i + 1]
    if (next && next.t - points[i].t > threshold) {
      out.push({ t: (points[i].t + next.t) / 2, value: null })
    }
  }
  return out
}

function formatTick(ts: number, range: ChartRange): string {
  const d = new Date(ts)
  if (range === "day") {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatFullTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type TooltipProps = {
  active?: boolean
  payload?: { payload: Point }[]
}

function FlowTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg shadow-black/40 min-w-40">
      <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
        {formatFullTs(point.t)}
      </p>
      {point.value !== null ? (
        <p className="mt-1 text-lg text-foreground [font-variant-numeric:tabular-nums]">
          {point.value.toFixed(2)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No pumping</p>
      )}
    </div>
  )
}
