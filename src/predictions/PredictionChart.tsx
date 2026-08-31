import { useId, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartRange, PredictionChartPoint } from "@/lib/types"
import { useIsNarrow } from "@/lib/useIsNarrow"

type Point = {
  t: number
  predicted: number
  actual: number | null
  confidence: number
}

/**
 * Predicted vs actual water level for one borehole. Two series over one
 * time axis:
 *   - predicted: always present, dashed line with a muted fill — this is
 *     the forecast, kept visually secondary so it doesn't dominate real
 *     readings.
 *   - actual: solid line, connectNulls={false} so still-future or missing
 *     points render as gaps while predicted keeps drawing through.
 *
 * Confidence is a 0..1 inter-tree agreement heuristic. Shown in the tooltip
 * as a percentage only — deliberately NOT drawn as a shaded band because
 * it isn't a calibrated ±metre interval.
 *
 * Recharts config mirrors WaterLevelChart so the two charts read as
 * siblings: same XAxis type="number" + epoch-ms dataKey for true time
 * spacing, same yDomain padding rule, same tooltip shape, same colors
 * via CSS variables.
 */
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
  const predGradId = useId()
  const narrow = useIsNarrow()

  const data = useMemo<Point[]>(
    () =>
      points
        .map((p) => ({
          t: new Date(p.t).getTime(),
          predicted: p.predicted,
          actual: p.actual,
          confidence: p.confidence,
        }))
        .sort((a, b) => a.t - b.t),
    [points],
  )

  const yDomain = useMemo<[number, number]>(() => {
    // Feed both series into min/max. Actual may be sparser than predicted
    // (future points are null), so we skip nulls but weight thresholds so
    // the reference lines never fall off-chart.
    const numeric: number[] = []
    for (const d of data) {
      numeric.push(d.predicted)
      if (d.actual !== null) numeric.push(d.actual)
    }
    if (numeric.length === 0) return [0, 1]
    const thresholds = [criticalLow, optimalHigh].filter(
      (v): v is number => v !== undefined,
    )
    const min = Math.min(...numeric, ...thresholds)
    const max = Math.max(...numeric, ...thresholds)
    const padding = Math.max(1.5, (max - min) * 0.1)
    return [min - padding, max + padding]
  }, [data, criticalLow, optimalHigh])

  if (data.length === 0) return null

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: narrow ? 4 : 12, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id={predGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
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
            tickFormatter={(ts: number) => formatTick(ts, range, narrow)}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: narrow ? 10 : 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            minTickGap={narrow ? 32 : 40}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: narrow ? 10 : 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            width={narrow ? 32 : 44}
            domain={yDomain}
            tickFormatter={(v: number) => v.toFixed(0)}
            tickCount={narrow ? 4 : 5}
          />

          {criticalLow !== undefined && (
            <ReferenceLine
              y={criticalLow}
              stroke="var(--destructive)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={
                narrow
                  ? undefined
                  : {
                      value: `Critical ${criticalLow}m`,
                      position: "insideBottomLeft",
                      fill: "var(--destructive)",
                      fontSize: 10,
                      dy: -4,
                    }
              }
            />
          )}
          {optimalHigh !== undefined && (
            <ReferenceLine
              y={optimalHigh}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={
                narrow
                  ? undefined
                  : {
                      value: `Optimal ${optimalHigh}m`,
                      position: "insideTopLeft",
                      fill: "var(--muted-foreground)",
                      fontSize: 10,
                      dy: 12,
                    }
              }
            />
          )}

          {/* Predicted — dashed, muted fill. Renders continuously across
              the whole range (no gaps) since predictions are always
              generated. */}
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="var(--primary)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeOpacity={0.75}
            fill={`url(#${predGradId})`}
            isAnimationActive
            animationDuration={600}
            dot={false}
            activeDot={false}
          />

          {/* Actual — solid, no fill, gaps for missing/future points. */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--primary)"
            strokeWidth={2}
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
            content={<PredictionTooltip />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatTick(ts: number, range: ChartRange, narrow = false): string {
  const d = new Date(ts)
  if (range === "day") {
    return narrow
      ? d.toLocaleTimeString(undefined, { hour: "2-digit" })
      : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
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

function PredictionTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const confPct = Math.round(point.confidence * 100)
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg shadow-black/40 min-w-44">
      <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
        {formatFullTs(point.t)}
      </p>
      <div className="mt-1.5 flex flex-col gap-0.5 text-sm [font-variant-numeric:tabular-nums]">
        <TooltipRow
          label="Predicted"
          value={`${point.predicted.toFixed(2)} m`}
          swatch={<Dashed />}
        />
        <TooltipRow
          label="Actual"
          value={point.actual !== null ? `${point.actual.toFixed(2)} m` : "—"}
          swatch={<Solid />}
        />
      </div>
      <p className="mt-1.5 pt-1.5 border-t border-border/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground [font-variant-numeric:tabular-nums]">
        Confidence <span className="text-foreground normal-case tracking-normal">{confPct}%</span>
      </p>
    </div>
  )
}

function TooltipRow({
  label,
  value,
  swatch,
}: {
  label: string
  value: string
  swatch: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {swatch}
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function Solid() {
  return (
    <svg width={14} height={4} viewBox="0 0 14 4" aria-hidden>
      <line x1={0} y1={2} x2={14} y2={2} stroke="var(--primary)" strokeWidth={2} />
    </svg>
  )
}

function Dashed() {
  return (
    <svg width={14} height={4} viewBox="0 0 14 4" aria-hidden>
      <line
        x1={0}
        y1={2}
        x2={14}
        y2={2}
        stroke="var(--primary)"
        strokeOpacity={0.75}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
    </svg>
  )
}
