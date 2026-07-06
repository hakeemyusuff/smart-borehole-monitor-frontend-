import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { FlowReading, WaterLevelReading } from "@/lib/types"

export const readingsKeys = {
  waterLevel: (boreholeId: number, sensorId: number) =>
    ["readings", "water-level", boreholeId, sensorId] as const,
  flow: (boreholeId: number, sensorId: number) =>
    ["readings", "flow", boreholeId, sensorId] as const,
}

export function useWaterLevelReadings(
  boreholeId: number | undefined,
  sensorId: number | undefined,
) {
  const enabled = boreholeId !== undefined && sensorId !== undefined
  return useQuery({
    queryKey: enabled
      ? readingsKeys.waterLevel(boreholeId, sensorId)
      : ["readings", "water-level", "unknown"],
    queryFn: () =>
      api.get<WaterLevelReading[]>(
        `/api/sensors/readings/water-level/${boreholeId}/${sensorId}`,
      ),
    enabled,
  })
}

export function useFlowReadings(
  boreholeId: number | undefined,
  sensorId: number | undefined,
) {
  const enabled = boreholeId !== undefined && sensorId !== undefined
  return useQuery({
    queryKey: enabled
      ? readingsKeys.flow(boreholeId, sensorId)
      : ["readings", "flow", "unknown"],
    queryFn: () =>
      api.get<FlowReading[]>(
        `/api/sensors/readings/flow-reading/${boreholeId}/${sensorId}`,
      ),
    enabled,
  })
}
