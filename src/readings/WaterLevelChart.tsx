import { useId, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartPoint, ChartRange, RainChartPoint } from "@/lib/types"
import { useIsNarrow } from "@/lib/useIsNarrow"
import { prepareReadings, chartTick, formatWat, isIsolatedPoint } from "./chart-data"

type Point = { t: number; value: number | null }

export function WaterLevelChart({
  points,
  range,
  criticalLow,
  optimalHigh,
  rainPoints,
}: {
  points: ChartPoint[]
  range: ChartRange
  criticalLow?: number
  optimalHigh?: number
  /** Recharge context — rendered as a separate strip below, sharing the same time domain. */
  rainPoints?: RainChartPoint[]
}) {
  const gradientId = useId()
  const narrow = useIsNarrow()

  const data = useMemo<Point[]>(
    () =>
      prepareReadings(points, range, "level"),
    [points, range],
  )

  const rain = useMemo<Point[]>(
    () =>
      (rainPoints ?? [])
        .map((p) => ({ t: Date.parse(p.t), value: p.precipitation }))
        .filter((p) => Number.isFinite(p.t) && p.value !== null),
    [rainPoints],
  )

  // One shared time domain for the level plot AND the rain strip: the two
  // plots then line up column-for-column, so "it rained → level rose" reads
  // vertically instead of being two unrelated x-scales.
  const timeDomain = useMemo<[number, number]>(() => {
    const ts = [...data, ...rain].map((p) => p.t).filter(Number.isFinite)
    if (ts.length === 0) return [0, 1]
    if (ts.length === 1) return [ts[0] - 3_600_000, ts[0] + 3_600_000]
    return [Math.min(...ts), Math.max(...ts)]
  }, [data, rain])

  const yDomain = useMemo<[number, number]>(() => {
    const values = data.flatMap((p) => (p.value === null ? [] : [p.value]))
    if (values.length === 0) return [0, 1]
    const thresholds = [criticalLow, optimalHigh].filter(
      (v): v is number => v !== undefined,
    )
    const min = Math.min(...values, ...thresholds)
    const max = Math.max(...values, ...thresholds)
    const padding = Math.max(0.5, (max - min) * 0.15)
    return [Math.max(0, min - padding), max + padding]
  }, [data, criticalLow, optimalHigh])

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No valid level observations in this window.
      </p>
    )
  }

  const showRain = rain.length > 0
  const tickFontSize = narrow ? 10 : 11
  const gapThreshold = range === "month" ? 36 * 3_600_000 : range === "week" ? 1.5 * 3_600_000 : 3_600_000

  return (
    <div className="w-full h-full min-w-0 flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: narrow ? 4 : 14, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={timeDomain}
              tickFormatter={(t: number) => chartTick(t, range)}
              tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
              stroke="var(--border)"
              tickLine={{ stroke: "var(--border)" }}
              minTickGap={35}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v: number) => v.toFixed(1)}
              width={narrow ? 36 : 44}
              tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
              stroke="var(--border)"
              tickLine={{ stroke: "var(--border)" }}
            />
            {criticalLow !== undefined && (
              <ReferenceLine
                y={criticalLow}
                stroke="var(--destructive)"
                strokeDasharray="4 4"
                strokeOpacity={0.8}
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
              type="linear"
              dataKey="value"
              name={range === "day" ? "Measured level" : "Average level"}
              unit=" m"
              stroke="var(--primary)"
              fill={`url(#${gradientId})`}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              // Dots only on isolated readings: connected stretches stay
              // clean lines, but lone points would otherwise vanish.
              dot={(props) => {
                const isolated = isIsolatedPoint(data, props.index, gapThreshold)
                if (!isolated || props.cx == null || props.cy == null) return null
                return (
                  <Dot
                    cx={props.cx}
                    cy={props.cy}
                    r={narrow ? 2.5 : 3.5}
                    fill="var(--primary)"
                    stroke="var(--background)"
                    strokeWidth={1.5}
                  />
                )
              }}
              activeDot={{ r: 5 }}
            />
            <Tooltip
              labelFormatter={(v) => formatWat(Number(v))}
              formatter={(v) => [`${Number(v).toFixed(3)} m`, range === "day" ? "Measured" : "Average"]}
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                borderColor: "var(--border)",
                borderRadius: 10,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {showRain && (
        <div className="h-20 shrink-0 border-t border-border pt-1 mt-2">
          <p className="text-[10px] text-muted-foreground">
            Weather precipitation snapshots (mm) · separate from measured groundwater
          </p>
          <ResponsiveContainer width="100%" height="70%">
            <AreaChart data={rain} margin={{ left: narrow ? 36 : 44, right: narrow ? 4 : 14, top: 4 }}>
              <XAxis
                dataKey="t"
                type="number"
                domain={timeDomain}
                tickFormatter={(t: number) => chartTick(t, range)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                stroke="var(--border)"
                tickLine={false}
                minTickGap={40}
              />
              <YAxis hide domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax * 1.2))]} />
              <Area
                dataKey="value"
                name="Precipitation snapshot"
                stroke="#60a5fa"
                fill="#60a5fa"
                fillOpacity={0.15}
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip
                labelFormatter={(v) => formatWat(Number(v))}
                formatter={(v) => [`${Number(v).toFixed(2)} mm`, "Snapshot"]}
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  borderColor: "var(--border)",
                  borderRadius: 10,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
