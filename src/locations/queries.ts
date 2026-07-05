import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Location, LocationCreate } from "@/lib/types"

export const locationsKeys = {
  all: ["locations"] as const,
  detail: (id: number) => ["locations", id] as const,
}

export function useLocations() {
  return useQuery({
    queryKey: locationsKeys.all,
    queryFn: () => api.get<Location[]>("/api/locations/"),
  })
}

export function useLocation(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? locationsKeys.detail(id) : ["locations", "unknown"],
    queryFn: () => api.get<Location>(`/api/locations/${id}`),
    enabled: id !== undefined,
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LocationCreate) => api.post<Location>("/api/locations/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: locationsKeys.all })
    },
  })
}
