import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})

// Applied to queries backed by live microcontroller data — cylinder latest,
// aggregated charts, raw logs. Backend has no WS/SSE yet, so we poll.
// Kept in one place so the cadence is easy to tune.
export const LIVE_POLL_MS = 10_000

export const liveQueryOptions = {
  refetchInterval: LIVE_POLL_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const
