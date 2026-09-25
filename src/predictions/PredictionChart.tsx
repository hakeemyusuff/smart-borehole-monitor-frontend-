import { useMemo } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Dot,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartRange, PredictionChartPoint } from "@/lib/types"
import { useIsNarrow } from "@/lib/useIsNarrow"
import { chartTick, formatWat } from "@/readings/chart-data"

type Point = {
  t: number
  predicted: number | null
  actual: number | null
  issued_at: string | null
  model_version: string | null
}

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

  const data = useMemo<Point[]>(
    () =>
      points
        .map((p) => ({
          t: Date.parse(p.t),
          predicted: p.predicted,
          actual: p.actual,
          issued_at: p.issued_at,
          model_version: p.model_version,
        }))
        .filter((p) => Number.isFinite(p.t))
        .sort((a, b) => a.t - b.t),
    [points],
  )

  const values = useMemo(
    () =>
      data.flatMap((p) =>
        [p.predicted, p.actual].filter(
          (v): v is number => v !== null && Number.isFinite(v),
        ),
      ),
    [data],
  )

  // Tight data-driven domain (±0.3 m): forecast and observed differ by only
  // a few centimetres, so a full-scale axis (0–7 m) renders the two lines on
  // top of each other. Reference-line thresholds can sit outside this window
  // — they are horizontal rails, and clipping them is fine.
  const yDomain = useMemo<[string, string]>(() => {
    if (values.length === 0) return ["0", "1"]
    return ["dataMin - 0.3", "dataMax + 0.3"]
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
            tickFormatter={(v: number) => v.toFixed(1)}
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
          <Line
            type="linear"
            dataKey="predicted"
            name="Forecast"
            stroke={FORECAST_COLOR}
            strokeDasharray="4 4"
            strokeWidth={2}
            connectNulls
            isAnimationActive={false}
            dot={(props) => {
              // Small markers on every populated forecast point so paired
              // observations stay legible when the lines nearly coincide;
              // gap buckets (value null) get no dot.
              if (props.value == null || props.cx == null || props.cy == null) return null
              return (
                <Dot
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill={FORECAST_COLOR}
                  stroke="var(--background)"
                  strokeWidth={1}
                />
              )
            }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="linear"
            dataKey="actual"
            name="Observed"
            stroke={OBSERVED_COLOR}
            strokeWidth={2}
            connectNulls
            isAnimationActive={false}
            dot={(props) => {
              if (props.value == null || props.cx == null || props.cy == null) return null
              return (
                <Dot
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill={OBSERVED_COLOR}
                  stroke="var(--background)"
                  strokeWidth={1}
                />
              )
            }}
            activeDot={{ r: 5 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as Point
              return (
                <div className="rounded-xl border border-border bg-popover p-3 shadow-xl text-xs space-y-2 min-w-44">
                  <p className="text-muted-foreground">Target · {formatWat(point.t)}</p>
                  <p style={{ color: FORECAST_COLOR }}>
                    Forecast: {point.predicted === null ? "—" : `${point.predicted.toFixed(3)} m`}
                  </p>
                  <p style={{ color: OBSERVED_COLOR }}>
                    Observed: {point.actual === null ? "Not yet matched" : `${point.actual.toFixed(3)} m`}
                  </p>
                  {point.predicted !== null && point.actual !== null && (
                    <p>Absolute error: {(Math.abs(point.predicted - point.actual) * 100).toFixed(2)} cm</p>
                  )}
                  <p className="text-muted-foreground border-t border-border pt-2">
                    Issued · {formatWat(point.issued_at)}
                  </p>
                  {point.model_version && (
                    <p className="text-muted-foreground/70 break-all">{point.model_version}</p>
                  )}
                </div>
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
