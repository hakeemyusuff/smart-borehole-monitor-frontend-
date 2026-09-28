import { test } from "node:test"
import assert from "node:assert/strict"
import {
  prepareReadings,
  isForecastFresh,
  isIsolatedPoint,
  buildDailyVolumes,
  startOfLagosDay,
  formatRuntime,
} from "../src/readings/chart-data.ts"
import type { PumpWindow } from "../src/lib/types.ts"

const HOUR = 3_600_000
const DAY = 86_400_000

const point = (day: number, value: number | null = 25) => ({ t: `2026-09-${String(day).padStart(2,"0")}T00:00:00Z`, value })

test("daily flow buckets stay connected; a missing day remains a gap", () => {
  const data=prepareReadings([point(3),point(1),point(2),point(5)],"month","flow")
  assert.equal(data.length,5)
  assert.equal(data.filter(p => p.value === null).length,1)
  assert.equal(data[0].t,Date.parse(point(1).t))
})
test("hourly pressure data does not bridge a missing bucket", () => {
  const data=prepareReadings([{t:"2026-09-01T00:00Z",value:6},{t:"2026-09-01T02:00Z",value:7}],"week","level")
  assert.equal(data.length,3); assert.equal(data[1].value,null)
})
test("single observations and genuine zeros are retained", () => {
  assert.equal(prepareReadings([point(1,0)],"month","flow")[0].value,0)
  assert.equal(prepareReadings([point(1)],"day","level").length,1)
})
test("invalid values are missing, never silently treated as zero", () => {
  assert.equal(prepareReadings([point(1,NaN)],"day","flow")[0].value,null)
})
test("isolated points are those surrounded by gaps; mid-stretch points are not", () => {
  const data = [
    { t: 0, value: null },
    { t: HOUR, value: 5 },
    { t: 2 * HOUR, value: 6 },
    { t: 3 * HOUR, value: null },
    { t: 9 * HOUR, value: 7 },
  ]
  assert.equal(isIsolatedPoint(data, 1, HOUR), false)
  assert.equal(isIsolatedPoint(data, 2, HOUR), false)
  assert.equal(isIsolatedPoint(data, 4, HOUR), true)
  assert.equal(isIsolatedPoint(data, 0, HOUR), false)
  assert.equal(isIsolatedPoint(data, 3, HOUR), false)
})

test("a single lone point counts as isolated", () => {
  assert.equal(isIsolatedPoint([{ t: 0, value: 3 }], 0, HOUR), true)
})

test("startOfLagosDay snaps to the WAT (UTC+1) midnight boundary", () => {
  // 12:40 WAT on 23 Sept → 00:00 WAT that same day = 23:00Z on 22 Sept.
  const noon = Date.parse("2026-09-23T11:40:00Z")
  assert.equal(startOfLagosDay(noon), Date.parse("2026-09-22T23:00:00Z"))
})

test("daily volumes: zero-run days are nulls, populated days aggregate", () => {
  const now = Date.parse("2026-09-25T12:00:00Z")
  const windows: PumpWindow[] = [
    // Two runs on the same WAT day (24 Sept) — volumes and runtime must sum.
    { start: "2026-09-24T09:00:00Z", end: "2026-09-24T09:30:00Z", volume_litres: 700, duration_min: 30, avg_rate: 23.3 },
    { start: "2026-09-24T15:00:00Z", end: "2026-09-24T15:30:00Z", volume_litres: 740, duration_min: 30, avg_rate: 24.7 },
  ]
  const data = buildDailyVolumes(windows, "week", now)
  assert.equal(data.length, 7)
  // Every bucket lands on a WAT midnight; days ascend evenly.
  for (let i = 1; i < data.length; i++) assert.equal(data[i].t - data[i - 1].t, DAY)
  const sept24 = data.find((d) => d.t === Date.parse("2026-09-23T23:00:00Z"))
  assert.ok(sept24)
  assert.equal(sept24.volume, 1440)
  assert.equal(sept24.runtimeMin, 60)
  assert.equal(data.filter((d) => d.volume === null).length, 6)
})

test("daily volumes: a run crossing WAT midnight splits pro rata by duration", () => {
  const now = Date.parse("2026-09-25T12:00:00Z")
  const windows: PumpWindow[] = [
    // 22:45Z→23:15Z = 23:45–24:00 WAT on the 24th + 00:00–00:15 WAT on the 25th
    // (WAT midnight is 23:00Z).
    { start: "2026-09-24T22:45:00Z", end: "2026-09-24T23:15:00Z", volume_litres: 600, duration_min: 30, avg_rate: 20 },
  ]
  const data = buildDailyVolumes(windows, "week", now)
  const d24 = data.find((d) => d.t === Date.parse("2026-09-23T23:00:00Z"))
  const d25 = data.find((d) => d.t === Date.parse("2026-09-24T23:00:00Z"))
  assert.ok(d24 && d25)
  assert.equal(d24.volume, 300) // half the run's volume by duration
  assert.equal(d25.volume, 300)
  assert.equal(d24.runtimeMin, 15)
  assert.equal(d25.runtimeMin, 15)
  assert.equal(data.filter((d) => d.volume === null).length, 5)
})

test("daily volumes: runs outside the window are clamped to it", () => {
  const now = Date.parse("2026-09-25T12:00:00Z")
  const windows: PumpWindow[] = [
    // Ends inside the window: only the in-window slice counts.
    { start: "2026-09-18T00:00:00Z", end: "2026-09-19T06:00:00Z", volume_litres: 9000, duration_min: 1800, avg_rate: 5 },
    // Wholly before the window: ignored.
    { start: "2026-09-01T00:00:00Z", end: "2026-09-01T01:00:00Z", volume_litres: 1000, duration_min: 60, avg_rate: 16.7 },
  ]
  const data = buildDailyVolumes(windows, "week", now)
  assert.equal(data.length, 7)
  // WAT day 19 Sept (bucket 23:00Z on the 18th) captures the clamped slice
  // 23:00Z→06:00Z = 7h of the 30h run → 9000 × 7/30.
  const sept19 = data.find((d) => d.t === Date.parse("2026-09-18T23:00:00Z"))
  assert.ok(sept19)
  assert.equal(sept19.volume, 2100)
  // First bucket is the partial "today − 6 days" (starts 23:00Z on the 18th).
  const first = data[0]
  assert.equal(first.t, startOfLagosDay(now) - 6 * DAY)
})

test("daily volumes: malformed timestamps are skipped without throwing", () => {
  const now = Date.parse("2026-09-25T12:00:00Z")
  const windows: PumpWindow[] = [
    { start: "not-a-date", end: "2026-09-24T10:00:00Z", volume_litres: 500, duration_min: 10, avg_rate: 50 },
    { start: "2026-09-24T10:00:00Z", end: "", volume_litres: 500, duration_min: 10, avg_rate: 50 },
  ]
  const data = buildDailyVolumes(windows, "week", now)
  assert.equal(data.length, 7)
  assert.ok(data.every((d) => d.volume === null))
})

test("formatRuntime renders minutes, mixed, and whole hours", () => {
  assert.equal(formatRuntime(48), "48 min")
  assert.equal(formatRuntime(83), "1h 23m")
  assert.equal(formatRuntime(120), "2h")
  assert.equal(formatRuntime(0), "")
  assert.equal(formatRuntime(null), "")
})

test("forecasts expire on stale status, offline checks, and past target times", () => {
  const now=Date.parse("2026-09-25T10:00Z")
  const status={status:"fresh" as const,message:"",checked_at:new Date(now).toISOString(),predicted_level_2h:6.8,issued_at:new Date(now).toISOString(),predicted_for:new Date(now+3_600_000).toISOString(),model_version:"test",current_level:6.9,current_level_captured_at:new Date(now).toISOString()}
  assert.equal(isForecastFresh(status,now),true)
  assert.equal(isForecastFresh(status,now,true),false)
  assert.equal(isForecastFresh(status,now+120_001),false)
  assert.equal(isForecastFresh({...status,status:"stale"},now),false)
  assert.equal(isForecastFresh({...status,predicted_for:new Date(now).toISOString()},now),false)
  assert.equal(isForecastFresh({...status,predicted_level_2h:null},now),false)
})

test("backend one-sample pump windows retain their estimated volume and duration", () => {
  const now = Date.parse("2026-09-25T12:00:00Z")
  const data = buildDailyVolumes([
    {start:"2026-09-24T10:00:00Z",end:"2026-09-24T10:00:00Z",volume_litres:25,duration_min:1,avg_rate:25},
    {start:"2026-09-24T11:00:00Z",end:"2026-09-24T11:01:00Z",volume_litres:50,duration_min:2,avg_rate:25},
  ], "week", now)
  const populated = data.filter(d => d.volume !== null)
  assert.equal(populated.length, 1)
  assert.equal(populated[0].volume, 75)
  assert.equal(populated[0].runtimeMin, 3)
})

test("recommendation cannot stay actionable after expiry or a failed refresh", async () => {
  const {isRecommendationCurrent} = await import("../src/readings/chart-data.ts")
  const now = Date.parse("2026-09-25T12:00:00Z")
  const assessment = {assessed_at:new Date(now).toISOString(),valid_until:new Date(now+60_000).toISOString()}
  assert.equal(isRecommendationCurrent(assessment,now),true)
  assert.equal(isRecommendationCurrent(assessment,now,true),false)
  assert.equal(isRecommendationCurrent(assessment,now+60_000),false)
  assert.equal(isRecommendationCurrent(assessment,now-1),false)
  assert.equal(isRecommendationCurrent(undefined,now),false)
})

test("forecast chart bridges use elapsed time and preserve recorded values", async () => {
  const {prepareForecastChart} = await import("../src/readings/chart-data.ts")
  const row = (t: string, actual: number | null, predicted: number | null) => ({t,actual,predicted,confidence:null,issued_at:null,model_version:null})
  const source = [row("2026-09-25T03:00Z",6.9,7),row("2026-09-25T00:00Z",6.6,6.7),row("2026-09-25T01:00Z",null,null)]
  const original = JSON.stringify(source)
  const data = prepareForecastChart(source)
  assert.equal(data.length,4)
  assert.equal(data[1].forecast_actual,null)
  assert.equal(data[1].actual,null)
  assert.equal(data[1].predicted,null)
  assert.ok(Math.abs(data[1].forecast_interpolated!-6.7)<1e-10)
  assert.ok(Math.abs(data[2].predicted_interpolated!-6.9)<1e-10)
  assert.equal(data[1].observation_bridge,true)
  assert.equal(data[1].prediction_bridge,true)
  assert.equal(data[0].observation_bridge,false)
  assert.equal(JSON.stringify(source),original)
  assert.equal(data.filter(p=>p.actual!==null && p.predicted!==null).length,2)
})

test("forecast chart never extrapolates missing leading or trailing observations", async () => {
  const {prepareForecastChart} = await import("../src/readings/chart-data.ts")
  const data=prepareForecastChart([null,6.8,null].map((actual,i)=>({t:`2026-09-25T0${i}:00Z`,actual,predicted:6.9,confidence:null,issued_at:null,model_version:null})))
  assert.equal(data[0].forecast_interpolated,null)
  assert.equal(data[1].forecast_actual,6.8)
  assert.equal(data[2].forecast_interpolated,null)
  assert.ok(data.every(p=>!p.observation_bridge))
})

test("observation and forecast gap bridges are independent", async () => {
  const {prepareForecastChart} = await import("../src/readings/chart-data.ts")
  const data=prepareForecastChart([6.7,6.8,6.9].map((actual,i)=>({t:`2026-09-25T0${i}:00Z`,actual,predicted:i===1?null:actual+.1,confidence:null,issued_at:null,model_version:null})))
  assert.equal(data[1].prediction_bridge,true)
  assert.equal(data[1].observation_bridge,false)
  assert.equal(data[1].forecast_actual,6.8)
  assert.equal(data[1].predicted,null)
})
