import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api"
import { liveQueryOptions } from "@/lib/query-client"
import type {
  PaginatedEnvelope,
  Pump,
  PumpCreate,
  PumpHistory,
  PumpStatus,
  PumpStatusChangeResponse,
  PumpWindow,
  StatusChange,
} from "@/lib/types"

export const pumpKeys = {
  forBorehole: (boreholeId: number) => ["pump", boreholeId] as const,
  history: (boreholeId: number, skip: number, limit: number) =>
    ["pump-history", boreholeId, skip, limit] as const,
  historyAll: (boreholeId: number) => ["pump-history", boreholeId] as const,
  windows: (boreholeId: number) => ["pump-windows", boreholeId] as const,
}

export function usePump(boreholeId: number | undefined) {
  const enabled = boreholeId !== undefined
  return useQuery<Pump | null>({
    queryKey: enabled ? pumpKeys.forBorehole(boreholeId) : ["pump", "unknown"],
    queryFn: async () => {
      try {
        return await api.get<Pump>(`/api/pumps/${boreholeId}`)
      } catch (e) {
        // Backend returns 404 when the borehole has no pump yet — treat
        // as an empty-state result, not an error, so the UI can offer to
        // install one.
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
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

/**
 * GET /api/pumps/{borehole_id}/pump-windows returns one entry per pumping
 * event. Order isn't guaranteed by the contract — we sort by start descending
 * so callers can trust index 0 = latest.
 */
export function usePumpWindows(boreholeId: number | undefined) {
  const enabled = boreholeId !== undefined
  return useQuery({
    queryKey: enabled ? pumpKeys.windows(boreholeId) : ["pump-windows", "unknown"],
    queryFn: async () => {
      const raw = await api.get<PumpWindow[]>(
        `/api/pumps/${boreholeId}/pump-windows`,
      )
      return [...raw].sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
      )
    },
    enabled,
    ...liveQueryOptions,
  })
}

export function useCreatePump(boreholeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PumpCreate) => api.post<Pump>("/api/pumps/", body),
    onSuccess: (pump) => {
      // Server returns the installed pump — seed the cache so the
      // dashboard control card flips out of the "no pump" state
      // immediately.
      qc.setQueryData(pumpKeys.forBorehole(boreholeId), pump)
    },
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
