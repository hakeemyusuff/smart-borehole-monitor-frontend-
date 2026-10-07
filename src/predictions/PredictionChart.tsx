import { useMemo } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartRange, PredictionChartPoint } from "@/lib/types"
import { useIsNarrow } from "@/lib/useIsNarrow"
import { chartTick, formatWat, prepareForecastChart } from "@/readings/chart-data"

type Point = ReturnType<typeof prepareForecastChart>[number]

// Forecast (violet, dashed) vs observed (teal, solid). Forecast/observed
// magnitudes differ by centimetres, so colour + dash pattern carry the
// distinction — matching the forecast column and BoreholeCylinder accents.
const FORECAST_COLOR = "#c084fc"
const OBSERVED_COLOR = "#2dd4bf"

export function PredictionChart({
  points,
  range,
  criticalLow,
  optimalHigh,
}: {
  points: PredictionChartPoint[]
  range: ChartRange
  criticalLow?: number
  optimalHigh?: number
}) {
  const narrow = useIsNarrow()

  const data = useMemo(() => prepareForecastChart(points, range), [points, range])

  const values = useMemo(
    () =>
      data.flatMap((p) =>
        [p.predicted, p.actual].filter(
          (v): v is number => v !== null && Number.isFinite(v),
        ),
      ),
    [data],
  )

  // Tight data-driven domain (±0.2 m): forecast and observed differ by only
  // a few centimetres, so a full-scale axis (0–7 m) renders the two lines on
  // top of each other. Reference-line thresholds can sit outside this window
  // — they are horizontal rails, and clipping them is fine.
  const yDomain = useMemo<[string, string]>(() => {
    if (values.length === 0) return ["0", "1"]
    return ["dataMin - 0.2", "dataMax + 0.2"]
  }, [values])

  if (!data.length || !values.length) return null

  const tickFontSize = narrow ? 10 : 11

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: narrow ? 4 : 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={data.length === 1 ? [data[0].t - 3_600_000, data[0].t + 3_600_000] : ["dataMin", "dataMax"]}
            tickFormatter={(t: number) => chartTick(t, range)}
            tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
            stroke="var(--border)"
            tickLine={{ stroke: "var(--border)" }}
            minTickGap={35}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: "var(--muted-foreground)", fontSize: tickFontSize }}
            stroke="var(--border)"
            tickLine={{ stroke: "var(--border)" }}
            width={narrow ? 36 : 44}
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
          {/* Separate paths stop long outages connecting even between adjacent daily buckets. */}
          {(["observed_segment", "predicted_segment"] as const).flatMap(segmentKey => {
            const observed = segmentKey === "observed_segment"
            const primary = observed ? "forecast_actual" : "predicted"
            const bridge = observed ? "forecast_interpolated" : "predicted_interpolated"
            const color = observed ? OBSERVED_COLOR : FORECAST_COLOR
            return [...new Set(data.filter(p => p[bridge] !== null).map(p => p[segmentKey]))].flatMap(segment => [
              <Line key={`${segmentKey}-${segment}-bridge`} type="monotone"
                dataKey={(p: Point) => p[segmentKey] === segment ? p[bridge] : null}
                name={observed ? "Observed gap bridge" : "Forecast gap bridge"}
                stroke="#64748b" strokeDasharray="3 3" strokeWidth={1.5} dot={false}
                activeDot={false} connectNulls={false} isAnimationActive={false}/>,
              <Line key={`${segmentKey}-${segment}-actual`} type="monotone"
                dataKey={(p: Point) => p[segmentKey] === segment ? p[primary] : null}
                name={observed ? "Observed" : "Forecast"} stroke={color}
                strokeDasharray={observed ? undefined : "4 4"} strokeWidth={2}
                dot={range === "day" ? { r: 2.5 } : false}
                activeDot={{ r: 4, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false}/>,
            ])
          })}
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as Point
              if (point.observation_bridge || point.prediction_bridge) {
                return (
                  <div className="rounded-xl border border-border bg-popover p-3 shadow-xl text-xs space-y-2">
                    <p className="text-muted-foreground">{formatWat(point.t)}</p>
                    {point.observation_bridge && (
                      <p>{point.prediction_bridge ? "Observed: " : ""}{point.forecast_interpolated!.toFixed(2)} m</p>
                    )}
                    {point.prediction_bridge && (
                      <p>{point.observation_bridge ? "Forecast: " : ""}{point.predicted_interpolated!.toFixed(2)} m</p>
                    )}
                    <span className="inline-flex rounded-full border border-slate-500/40 bg-slate-500/15 px-2 py-1 text-[10px] text-muted-foreground">Estimated gap bridge</span>
                  </div>
                )
              }
              return (
                <div className="rounded-xl border border-border bg-popover p-3 shadow-xl text-xs space-y-2 min-w-44">
                  <p className="text-muted-foreground">{range === "day" ? "Target" : range === "week" ? "6-hour average from" : "Daily average from"} · {formatWat(point.t)}</p>
                  <p style={{ color: FORECAST_COLOR }}>
                    Forecast: {point.predicted === null ? "—" : `${point.predicted.toFixed(3)} m`}
                  </p>
                  <p style={{ color: OBSERVED_COLOR }}>
                    Observed: {point.actual === null ? "Not yet matched" : `${point.actual.toFixed(3)} m`}
                  </p>
                  {range === "day" && point.predicted !== null && point.actual !== null && (
                    <p>Absolute error: {(Math.abs(point.predicted - point.actual) * 100).toFixed(2)} cm</p>
                  )}
                  {range === "day" && point.issued_at && <p className="text-muted-foreground border-t border-border pt-2">
                    Issued · {formatWat(point.issued_at)}
                  </p>}
                  {range !== "day" && <p className="text-muted-foreground">
                    {point.observed_count} observations · {point.predicted_count} forecasts
                  </p>}
                </div>
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
