import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { liveQueryOptions } from "@/lib/query-client"
import type { ChartPoint, ChartRange } from "@/lib/types"

export const chartKeys = {
  waterLevel: (boreholeId: number, sensorId: number, range: ChartRange) =>
    ["readings", "water-level-chart", boreholeId, sensorId, range] as const,
  flow: (boreholeId: number, sensorId: number, range: ChartRange) =>
    ["readings", "flow-chart", boreholeId, sensorId, range] as const,
}

export function useWaterLevelChart(
  boreholeId: number | undefined,
  sensorId: number | undefined,
  range: ChartRange,
) {
  const enabled = boreholeId !== undefined && sensorId !== undefined
  return useQuery({
    queryKey: enabled
      ? chartKeys.waterLevel(boreholeId, sensorId, range)
      : ["readings", "water-level-chart", "unknown", range],
    queryFn: () =>
      api.get<ChartPoint[]>(
        `/api/sensors/readings/water-level/${boreholeId}/${sensorId}/chart?range_=${range}`,
      ),
    enabled,
    ...liveQueryOptions,
  })
}

export function useFlowChart(
  boreholeId: number | undefined,
  sensorId: number | undefined,
  range: ChartRange,
) {
  const enabled = boreholeId !== undefined && sensorId !== undefined
  return useQuery({
    queryKey: enabled
      ? chartKeys.flow(boreholeId, sensorId, range)
      : ["readings", "flow-chart", "unknown", range],
    queryFn: () =>
      api.get<ChartPoint[]>(
        `/api/sensors/readings/flow-reading/${boreholeId}/${sensorId}/chart?range_=${range}`,
      ),
    enabled,
    ...liveQueryOptions,
  })
}
