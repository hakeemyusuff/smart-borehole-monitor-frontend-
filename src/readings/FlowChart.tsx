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
import type { FlowReading } from "@/lib/types"

type Point = {
  t: number
  raw_reading: number
  calculated_flow_rate: number | null
  cummulative_volume: number | null
}

export function FlowChart({ readings }: { readings: FlowReading[] }) {
  const gradientId = useId()

  const data = useMemo<Point[]>(() => {
    return readings
      .map((r) => ({
        t: new Date(r.created_at).getTime(),
        raw_reading: r.raw_reading,
        calculated_flow_rate: r.calculated_flow_rate ?? null,
        cummulative_volume: r.cummulative_volume ?? null,
      }))
      .sort((a, b) => a.t - b.t)
  }, [readings])

  const yDomain = useMemo<[number, number]>(() => {
    const values = data.map((d) => d.raw_reading)
    const min = Math.min(...values)
    const max = Math.max(...values)
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

          <Area
            type="monotone"
            dataKey="raw_reading"
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
            content={<FlowTooltip />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatTick(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
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
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg text-foreground [font-variant-numeric:tabular-nums]">
          {point.raw_reading.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">raw</span>
      </p>
      {point.calculated_flow_rate !== null && (
        <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          Flow rate {point.calculated_flow_rate.toFixed(2)} L/min
        </p>
      )}
      {point.cummulative_volume !== null && (
        <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          Cumulative {point.cummulative_volume.toFixed(1)} L
        </p>
      )}
    </div>
  )
}
