import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { liveQueryOptions } from "@/lib/query-client"
import type { ChartRange, PredictionChartPoint } from "@/lib/types"

export const predictionKeys = {
  chart: (boreholeId: number, range: ChartRange) =>
    ["predictions", "chart", boreholeId, range] as const,
}

/**
 * GET /api/predictions/{borehole_id}/chart?range_={day|week|month}
 * Returns predicted + (optional) actual water level per bucket.
 * Live-polled so a fresh backfill or new actual reading updates without
 * a page refresh.
 */
export function usePredictionChart(
  boreholeId: number | undefined,
  range: ChartRange,
) {
  const enabled = boreholeId !== undefined
  return useQuery({
    queryKey: enabled
      ? predictionKeys.chart(boreholeId, range)
      : ["predictions", "chart", "unknown", range],
    queryFn: () =>
      api.get<PredictionChartPoint[]>(
        `/api/predictions/${boreholeId}/chart?range_=${range}`,
      ),
    enabled,
    ...liveQueryOptions,
  })
}
