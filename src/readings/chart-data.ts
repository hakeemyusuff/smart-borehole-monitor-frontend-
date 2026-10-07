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

/** Compare a real reading with a forecast saved before that reading existed. */
export function closestForecastForReading(
  points: import("../lib/types").PredictionChartPoint[],
  capturedAt: string | null,
  now: number,
  modelVersion: string | null,
) {
  const captured = capturedAt ? Date.parse(capturedAt) : NaN
  if (!Number.isFinite(captured) || captured > now || !modelVersion) return null
  const candidates = points.filter(point => {
    const target = Date.parse(point.t)
    const issued = point.issued_at ? Date.parse(point.issued_at) : NaN
    return point.model_version === modelVersion && point.predicted !== null
      && Number.isFinite(point.predicted) && point.predicted >= 0
      && Number.isFinite(target) && Math.abs(target - captured) <= 35 * 60_000
      && Number.isFinite(issued) && issued < captured && issued < target
  })
  candidates.sort((a, b) => Math.abs(Date.parse(a.t) - captured) - Math.abs(Date.parse(b.t) - captured)
    || Date.parse(a.t) - Date.parse(b.t))
  return candidates[0] ?? null
}

/** Display-only averages/bridges. Raw points remain the source for MAE and CSV. */
export function prepareForecastChart(
  points: import("../lib/types").PredictionChartPoint[],
  range: ChartRange = "day",
) {
  const valid = (value: number | null) => value !== null && Number.isFinite(value) ? value : null
  const sorted = points.map(p => ({ ...p, t: Date.parse(p.t), actual: valid(p.actual), predicted: valid(p.predicted) }))
    .filter(p => Number.isFinite(p.t)).sort((a, b) => a.t - b.t)
  const interval = range === "month" ? DAY_MS : range === "week" ? 6 * HOUR : HOUR / 2
  const maxGap = 12 * HOUR
  const bucketAt = (t: number) => range === "day" ? t
    : Math.floor((t + WAT_OFFSET_MS) / interval) * interval - WAT_OFFSET_MS
  const groups = new Map<number, typeof sorted>()
  for (const point of sorted) {
    const t = bucketAt(point.t)
    const group = groups.get(t) ?? []
    group.push(point)
    groups.set(t, group)
  }
  const mean = (rows: typeof sorted, key: "actual" | "predicted") => {
    const samples = rows.filter(row => row[key] !== null)
    // A daily average spanning a long outage would conceal missing coverage.
    const interrupted = samples.some((row, i) => i > 0 && row.t - samples[i - 1].t >= maxGap)
    return {
      value: samples.length && !interrupted ? samples.reduce((sum, row) => sum + row[key]!, 0) / samples.length : null,
      count: samples.length, first: samples[0]?.t ?? null, last: samples.at(-1)?.t ?? null,
    }
  }
  const data: Array<{
    t: number; actual: number | null; predicted: number | null; forecast_actual: number | null;
    forecast_interpolated: number | null; predicted_interpolated: number | null;
    observation_bridge: boolean; prediction_bridge: boolean; observed_segment: number; predicted_segment: number;
    observed_count: number; predicted_count: number; actual_first: number | null; actual_last: number | null;
    predicted_first: number | null; predicted_last: number | null; issued_at: string | null; model_version: string | null;
  }> = []
  if (!sorted.length) return data
  const times = new Set(groups.keys())
  for (let t = bucketAt(sorted[0].t); t <= bucketAt(sorted.at(-1)!.t); t += interval) times.add(t)
  for (const t of [...times].sort((a, b) => a - b)) {
    const rows = groups.get(t) ?? []
    const actual = mean(rows, "actual"), predicted = mean(rows, "predicted")
    data.push({
      t, actual: actual.value, predicted: predicted.value, forecast_actual: actual.value,
      forecast_interpolated: actual.value, predicted_interpolated: predicted.value,
      observation_bridge: false, prediction_bridge: false, observed_segment: 0, predicted_segment: 0,
      observed_count: actual.count, predicted_count: predicted.count,
      actual_first: actual.first, actual_last: actual.last, predicted_first: predicted.first, predicted_last: predicted.last,
      issued_at: range === "day" ? rows[0]?.issued_at ?? null : null,
      model_version: range === "day" ? rows[0]?.model_version ?? null : null,
    })
  }
  for (const [source, destination, flag, segmentKey] of [
    ["actual", "forecast_interpolated", "observation_bridge", "observed_segment"],
    ["predicted", "predicted_interpolated", "prediction_bridge", "predicted_segment"],
  ] as const) {
    let left = -1, segment = 0
    data.forEach((point, right) => {
      if (point[source] === null) return
      if (left >= 0) {
        const start = data[left]
        const rawGap = point[`${source}_first`]! - start[`${source}_last`]!
        if (rawGap >= maxGap) segment++
        else if (right > left + 1) {
          for (let i = left + 1; i < right; i++) {
            const fraction = (data[i].t - start.t) / (point.t - start.t)
            data[i][destination] = start[source]! + fraction * (point[source]! - start[source]!)
            data[i][flag] = true
            data[i][segmentKey] = segment
          }
        }
      }
      point[segmentKey] = segment
      left = right
    })
  }
  return data
}
