import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ChartRange, RainChartPoint, Weather } from "@/lib/types"

export const weatherKeys = {
  forLocation: (locationId: number) => ["weather", locationId] as const,
  chart: (locationId: number, range: ChartRange) =>
    ["weather", "chart", locationId, range] as const,
}

/**
 * GET /api/weathers/{location_id} returns a Weather[] for that location.
 * Backend orders ascending, so the latest reading is the LAST element.
 * Not polled at the live cadence — weather changes hourly at best, so we
 * lean on the query-client default staleTime + refetch on window focus.
 */
export function useWeatherSeries(locationId: number | undefined) {
  const enabled = locationId !== undefined
  return useQuery({
    queryKey: enabled
      ? weatherKeys.forLocation(locationId)
      : ["weather", "unknown"],
    queryFn: () => api.get<Weather[]>(`/api/weathers/${locationId}`),
    enabled,
  })
}

/**
 * GET /api/weathers/{location_id}/chart?range_={day|week|month}
 * Returns hourly rainfall bounded to the requested window — used to
 * overlay recharge context on the sensor water-level chart. Same
 * hourly cadence as the base weather series, so no live polling.
 */
export function useWeatherChart(
  locationId: number | undefined,
  range: ChartRange,
) {
  const enabled = locationId !== undefined
  return useQuery({
    queryKey: enabled
      ? weatherKeys.chart(locationId, range)
      : ["weather", "chart", "unknown", range],
    queryFn: () =>
      api.get<RainChartPoint[]>(
        `/api/weathers/${locationId}/chart?range_=${range}`,
      ),
    enabled,
  })
}
