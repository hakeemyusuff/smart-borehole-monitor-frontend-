import { usePump } from "@/pump/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatWat } from "@/readings/chart-data"

/** Observation-only firmware reports state; this UI cannot switch the pump. */
export function PumpControlCard({ boreholeId }: { boreholeId: number }) {
  const query = usePump(boreholeId)
  const pump = query.data
  return <Card><CardHeader><CardTitle>Last reported pump state</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-xl">{query.isPending ? "Loading…" : query.isError ? "Status unavailable" : pump ? pump.status.toUpperCase() : "No pump registered"}</p>
      {pump && <p className="text-xs text-muted-foreground">Last transition: {formatWat(pump.last_status_change)} · {pump.power_rating} kW · installed at {pump.depth} m</p>}
      <p className="text-sm text-muted-foreground">Observation only. Operate the pump on site; the dashboard does not send switching commands. A recorded state is not confirmation that the pump is currently running.</p>
    </CardContent>
  </Card>
}
