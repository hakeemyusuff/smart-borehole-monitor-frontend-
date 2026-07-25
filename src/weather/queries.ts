import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Weather } from "@/lib/types"

export const weatherKeys = {
  forLocation: (locationId: number) => ["weather", locationId] as const,
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
