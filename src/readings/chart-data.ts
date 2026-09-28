import type { ChartPoint, ChartRange, PredictionStatus, PumpWindow } from "../lib/types"

const HOUR = 3_600_000
export const rangeDescription: Record<ChartRange, string> = {
  day: "Last 24 hours · individual readings",
  week: "Last 7 days · hourly averages",
  month: "Last 30 days · daily averages",
}

export function prepareReadings(points: ChartPoint[], range: ChartRange, kind: "level" | "flow") {
  const threshold = range === "month" ? 36 * HOUR : range === "week" ? 1.5 * HOUR : kind === "flow" ? 5 * 60_000 : HOUR
  const sorted = points.map(p => ({ t: Date.parse(p.t), value: p.value !== null && Number.isFinite(p.value) ? p.value : null }))
    .filter(p => Number.isFinite(p.t)).sort((a, b) => a.t - b.t)
  const result: { t: number; value: number | null }[] = []
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1]
    if (previous && p.t - previous.t > threshold) result.push({ t: (previous.t + p.t) / 2, value: null })
    result.push(p)
  })
  return result
}

/**
 * True when a point has no populated neighbour within `threshold`, i.e. it is
 * surrounded by gaps. Used to keep isolated readings VISIBLE as dots while
 * connected stretches render as clean dotless lines (`dot={false}` alone
 * would make isolated points disappear entirely).
 */
export function isIsolatedPoint(
  data: { t: number; value: number | null }[],
  index: number,
  threshold: number,
): boolean {
  const p = data[index]
  if (!p || p.value === null) return false
  const prev = data[index - 1]
  const next = data[index + 1]
  const prevIsFar = !prev || prev.value === null || p.t - prev.t > threshold
  const nextIsFar = !next || next.value === null || next.t - p.t > threshold
  return prevIsFar && nextIsFar
}

// ─── Daily abstraction volume (flow week/month views) ─────────────────────

// West Africa Time is UTC+1 year-round (no DST), so "local day" boundaries
// are a fixed offset from epoch days.
const WAT_OFFSET_MS = 3_600_000
const DAY_MS = 86_400_000

/** Start of the WAT calendar day containing `ts`. */
export function startOfLagosDay(ts: number): number {
  // +offset aligns WAT midnights to epoch-day boundaries; the result shifts
  // the epoch midnight back to the real 23:00Z WAT-midnight instant.
  return Math.floor((ts + WAT_OFFSET_MS) / DAY_MS) * DAY_MS - WAT_OFFSET_MS
}

export type DailyVolumePoint = {
  /** Start of the WAT calendar day (also the chart X value). */
  t: number
  /** Estimated abstracted volume in litres; null when no event is recorded. */
  volume: number | null
  /** Total pump runtime in minutes across the day's runs. */
  runtimeMin: number | null
}

/**
 * Aggregate pump-run windows into one bucket per WAT calendar day for the
 * last 7 (week) or 30 (month) days. Every day of the window is emitted —
 * including days with no runs (volume null) — so bars sit on an even axis.
 * Volume is the backend's per-run total; a run crossing midnight is split
 * across days pro rata by its duration.
 */
export function buildDailyVolumes(
  windows: PumpWindow[],
  range: "week" | "month",
  now: number,
): DailyVolumePoint[] {
  const days = range === "week" ? 7 : 30
  const windowStart = startOfLagosDay(now) - (days - 1) * DAY_MS

  const buckets = new Map<number, { volume: number; runtimeMin: number }>()
  for (const w of windows) {
    const runStart = Date.parse(w.start)
    const runEnd = Date.parse(w.end)
    if (!Number.isFinite(runStart) || !Number.isFinite(runEnd)) continue
    // Clamp to the chart window — runs may straddle its edges. Volume is
    // pro-rated against the FULL run duration, so only the in-window share
    // of an edge-straddling run counts toward a day.
    // Backend duration includes the estimated last sample interval; end is
    // only the final sample timestamp. Keep single-sample events and runtime.
    const runSpanMs = w.duration_min * 60_000
    if (!Number.isFinite(runSpanMs) || runSpanMs <= 0 || !Number.isFinite(w.volume_litres) || w.volume_litres < 0) continue
    const from = Math.max(runStart, windowStart)
    const to = Math.min(runStart + runSpanMs, now)
    if (to <= from) continue
    let cursor = from
    while (cursor < to) {
      const dayStart = startOfLagosDay(cursor)
      const sliceEnd = Math.min(to, dayStart + DAY_MS)
      const bucket = buckets.get(dayStart) ?? { volume: 0, runtimeMin: 0 }
      bucket.volume += (w.volume_litres ?? 0) * ((sliceEnd - cursor) / runSpanMs)
      bucket.runtimeMin += (sliceEnd - cursor) / 60_000
      buckets.set(dayStart, bucket)
      cursor = sliceEnd
    }
  }

  return Array.from({ length: days }, (_, i) => {
    const t = windowStart + i * DAY_MS
    const b = buckets.get(t)
    return {
      t,
      volume: b ? Math.round(b.volume) : null,
      runtimeMin: b ? Math.round(b.runtimeMin) : null,
    }
  })
}

/** "Wednesday, 23 Sept" — WAT day header for the daily-volume tooltip. */
export function formatDayLabel(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "short",
  })
}

/** "48 min" / "1h 23m" / "2h"; empty string for absent runtime. */
export function formatRuntime(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins) || mins <= 0) return ""
  const total = Math.round(mins)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatWat(value: string | number | null | undefined) {
  if (value == null || !Number.isFinite(new Date(value).getTime())) return "—"
  return new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " WAT"
}

export function chartTick(ts: number, range: ChartRange) {
  return new Date(ts).toLocaleString("en-GB", { timeZone: "Africa/Lagos", ...(range === "day" ? { hour: "2-digit", minute: "2-digit", hour12: false } as const : { day: "2-digit", month: "short" } as const) })
}

/** "23 Sept" — X tick for daily-volume bars (same as chartTick's day form). */
export function volumeTick(ts: number): string {
  return chartTick(ts, "week")
}

export function isForecastFresh(status: PredictionStatus | undefined, now: number, failed = false) {
  return !!status && !failed && status.status === "fresh" && status.predicted_level_2h !== null
    && Number.isFinite(status.predicted_level_2h) && status.predicted_for !== null && Date.parse(status.predicted_for) > now
    && Number.isFinite(Date.parse(status.checked_at)) && now - Date.parse(status.checked_at) < 120_000
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) => `"${String(v ?? "").replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map(row => row.map(escape).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function isRecommendationCurrent(
  recommendation: { assessed_at: string; valid_until: string } | undefined,
  now: number,
  failed = false,
) {
  if (!recommendation || failed) return false
  const assessed = Date.parse(recommendation.assessed_at)
  return Number.isFinite(assessed) && assessed <= now && now - assessed < 120_000
    && Date.parse(recommendation.valid_until) > now
}

/** Display-only bridges. Original observations/forecasts remain unchanged. */
export function prepareForecastChart(points: import("../lib/types").PredictionChartPoint[]) {
  const valid = (value: number | null) => value !== null && Number.isFinite(value) ? value : null
  const sorted = points.map(p => ({ ...p, t: Date.parse(p.t) }))
    .filter(p => Number.isFinite(p.t)).sort((a, b) => a.t - b.t)
  // The API normally supplies null hourly buckets; also handle omitted buckets.
  const expanded: typeof sorted = []
  for (const p of sorted) {
    const previous = expanded.at(-1)
    if (previous && p.t - previous.t > HOUR) {
      for (let t = previous.t + HOUR; t < p.t; t += HOUR) {
        expanded.push({ t, predicted: null, actual: null, confidence: null, issued_at: null, model_version: null })
      }
    }
    expanded.push(p)
  }
  const data = expanded.map(p => ({
    ...p, predicted: valid(p.predicted), actual: valid(p.actual),
    forecast_actual: valid(p.actual), // Recorded observations, not interpolated measurements.
    forecast_interpolated: valid(p.actual),
    predicted_interpolated: valid(p.predicted),
    observation_bridge: false, prediction_bridge: false,
  }))
  for (const [source, destination, flag] of [
    ["actual", "forecast_interpolated", "observation_bridge"],
    ["predicted", "predicted_interpolated", "prediction_bridge"],
  ] as const) {
    let left = -1
    data.forEach((point, right) => {
      if (point[source] === null) return
      if (left >= 0 && right > left + 1) {
        const start = data[left]
        const duration = point.t - start.t
        for (let i = left + 1; i < right; i++) {
          const fraction = (data[i].t - start.t) / duration
          data[i][destination] = start[source]! + fraction * (point[source]! - start[source]!)
          data[i][flag] = true
        }
      }
      left = right
    })
  }
  return data
}
