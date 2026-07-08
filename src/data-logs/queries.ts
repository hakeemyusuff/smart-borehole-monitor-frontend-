import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  FlowReading,
  PaginatedEnvelope,
  WaterLevelReading,
} from "@/lib/types"

export type ReadingKind = "water-level" | "flow-reading"

export const dataLogsKeys = {
  page: (
    kind: ReadingKind,
    boreholeId: number,
    sensorId: number,
    skip: number,
    limit: number,
  ) => ["data-logs", kind, boreholeId, sensorId, skip, limit] as const,
}

type ReadingByKind = {
  "water-level": WaterLevelReading
  "flow-reading": FlowReading
}

export function useReadingsPage<K extends ReadingKind>(
  kind: K,
  boreholeId: number | undefined,
  sensorId: number | undefined,
  skip: number,
  limit: number,
) {
  const enabled = boreholeId !== undefined && sensorId !== undefined
  return useQuery({
    queryKey: enabled
      ? dataLogsKeys.page(kind, boreholeId, sensorId, skip, limit)
      : ["data-logs", kind, "unknown", skip, limit],
    queryFn: () =>
      api.get<PaginatedEnvelope<ReadingByKind[K]>>(
        `/api/sensors/readings/${kind}/${boreholeId}/${sensorId}?skip=${skip}&limit=${limit}`,
      ),
    enabled,
  })
}
