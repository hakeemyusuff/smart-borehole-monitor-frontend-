import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { liveQueryOptions } from "@/lib/query-client"
import type {
  PaginatedEnvelope,
  Pump,
  PumpHistory,
  PumpStatus,
  PumpStatusChangeResponse,
  StatusChange,
} from "@/lib/types"

export const pumpKeys = {
  forBorehole: (boreholeId: number) => ["pump", boreholeId] as const,
  history: (boreholeId: number, skip: number, limit: number) =>
    ["pump-history", boreholeId, skip, limit] as const,
  historyAll: (boreholeId: number) => ["pump-history", boreholeId] as const,
}

export function usePump(boreholeId: number | undefined) {
  const enabled = boreholeId !== undefined
  return useQuery({
    queryKey: enabled ? pumpKeys.forBorehole(boreholeId) : ["pump", "unknown"],
    queryFn: () => api.get<Pump>(`/api/pumps/${boreholeId}`),
    enabled,
    ...liveQueryOptions,
  })
}

export function usePumpHistoryPage(
  boreholeId: number | undefined,
  skip: number,
  limit: number,
) {
  const enabled = boreholeId !== undefined
  return useQuery({
    queryKey: enabled
      ? pumpKeys.history(boreholeId, skip, limit)
      : ["pump-history", "unknown", skip, limit],
    queryFn: () =>
      api.get<PaginatedEnvelope<PumpHistory>>(
        `/api/pumps/pump-histories/${boreholeId}?skip=${skip}&limit=${limit}`,
      ),
    enabled,
    ...liveQueryOptions,
  })
}

export function useChangePumpStatus(boreholeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (new_status: PumpStatus) =>
      api.post<PumpStatusChangeResponse>(
        `/api/pumps/change-status/manual/${boreholeId}`,
        { new_status } satisfies StatusChange,
      ),
    onSuccess: (res) => {
      // Server returns the fresh pump — write it straight into the cache
      // so the button flips as soon as the request resolves, without
      // waiting for the next 10s poll tick.
      qc.setQueryData(pumpKeys.forBorehole(boreholeId), res.pump)
      // History gained a new row; invalidate any page of it.
      qc.invalidateQueries({ queryKey: pumpKeys.historyAll(boreholeId) })
    },
  })
}
