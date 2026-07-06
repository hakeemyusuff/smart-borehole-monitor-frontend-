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
import type { WaterLevelReading } from "@/lib/types"

type Point = {
  t: number
  water_level: number
  calculated_water_depth: number | null
  label: string
}

export function WaterLevelChart({
  readings,
  criticalLow,
  optimalHigh,
}: {
  readings: WaterLevelReading[]
  criticalLow?: number
  optimalHigh?: number
}) {
  const gradientId = useId()

  const data = useMemo<Point[]>(() => {
    return readings
      .map((r) => {
        const t = new Date(r.created_at).getTime()
        return {
          t,
          water_level: r.water_level,
          calculated_water_depth: r.calculated_water_depth ?? null,
          label: r.created_at,
        }
      })
      .sort((a, b) => a.t - b.t)
  }, [readings])

  const yDomain = useMemo<[number, number]>(() => {
    const levels = data.map((d) => d.water_level)
    const rawMin = Math.min(...levels)
    const rawMax = Math.max(...levels)
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
            tickFormatter={formatTick}
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
            dataKey="water_level"
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

function formatTick(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatFullTs(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
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
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg text-foreground [font-variant-numeric:tabular-nums]">
          {point.water_level.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">m</span>
      </p>
      {point.calculated_water_depth !== null && (
        <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          Calculated depth {point.calculated_water_depth.toFixed(2)}m
        </p>
      )}
    </div>
  )
}
