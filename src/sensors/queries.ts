import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  SensorCreate,
  SensorCreateResponse,
  SensorPublic,
} from "@/lib/types"

export const sensorsKeys = {
  forBorehole: (boreholeId: number) =>
    ["sensors", "borehole", boreholeId] as const,
  detail: (id: number) => ["sensors", id] as const,
}

export function useSensorsForBorehole(boreholeId: number | undefined) {
  return useQuery({
    queryKey:
      boreholeId !== undefined
        ? sensorsKeys.forBorehole(boreholeId)
        : ["sensors", "borehole", "unknown"],
    queryFn: () =>
      api.get<SensorPublic[]>(`/api/sensors/boreholes/${boreholeId}`),
    enabled: boreholeId !== undefined,
  })
}

export function useCreateSensor(boreholeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SensorCreate) =>
      api.post<SensorCreateResponse>("/api/sensors/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sensorsKeys.forBorehole(boreholeId) })
    },
  })
}
