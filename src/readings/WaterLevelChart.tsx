import { useId, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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

export function WaterLevelChart({
  points,
  range,
  criticalLow,
  optimalHigh,
}: {
  points: ChartPoint[]
  range: ChartRange
  criticalLow?: number
  optimalHigh?: number
}) {
  const gradientId = useId()

  const data = useMemo<Point[]>(
    () =>
      points
        .map((p) => ({
          t: new Date(p.t).getTime(),
          value: p.value,
        }))
        .sort((a, b) => a.t - b.t),
    [points],
  )

  const yDomain = useMemo<[number, number]>(() => {
    const numeric = data
      .map((d) => d.value)
      .filter((v): v is number => v !== null)
    if (numeric.length === 0) return [0, 1]
    const rawMin = Math.min(...numeric)
    const rawMax = Math.max(...numeric)
    const thresholds = [criticalLow, optimalHigh].filter(
      (v): v is number => v !== undefined,
    )
    const min = Math.min(rawMin, ...thresholds)
    const max = Math.max(rawMax, ...thresholds)
    const padding = Math.max(1.5, (max - min) * 0.1)
    return [min - padding, max + padding]
  }, [data, criticalLow, optimalHigh])

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

          {criticalLow !== undefined && (
            <ReferenceLine
              y={criticalLow}
              stroke="var(--destructive)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: `Critical ${criticalLow}m`,
                position: "insideBottomLeft",
                fill: "var(--destructive)",
                fontSize: 10,
                dy: -4,
              }}
            />
          )}
          {optimalHigh !== undefined && (
            <ReferenceLine
              y={optimalHigh}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `Optimal ${optimalHigh}m`,
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 10,
                dy: 12,
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
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
            content={<WaterLevelTooltip />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
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

function WaterLevelTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg shadow-black/40 min-w-40">
      <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
        {formatFullTs(point.t)}
      </p>
      {point.value !== null ? (
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg text-foreground [font-variant-numeric:tabular-nums]">
            {point.value.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">m</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No reading</p>
      )}
    </div>
  )
}
