import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Borehole, BoreholeCreate } from "@/lib/types"

export const boreholesKeys = {
  all: ["boreholes"] as const,
  detail: (id: number) => ["boreholes", id] as const,
}

export function useBoreholes() {
  return useQuery({
    queryKey: boreholesKeys.all,
    queryFn: () => api.get<Borehole[]>("/api/boreholes/"),
  })
}

export function useBorehole(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? boreholesKeys.detail(id) : ["boreholes", "unknown"],
    queryFn: () => api.get<Borehole>(`/api/boreholes/${id}`),
    enabled: id !== undefined,
  })
}

export function useCreateBorehole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BoreholeCreate) => api.post<Borehole>("/api/boreholes/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boreholesKeys.all })
    },
  })
}
