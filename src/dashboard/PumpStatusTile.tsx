import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Honest placeholder — the backend has no pump telemetry yet, so we do not
 * infer running/idle from anything. Kept as its own component so it can be
 * swapped for the real one once pump endpoints land.
 */
export function PumpStatusTile() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Pump status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2">
          <span
            className="size-1.5 rounded-full bg-muted-foreground/70"
            aria-hidden
          />
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Not yet instrumented
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-prose">
          Pump telemetry isn't wired up yet — no running/idle signal is
          available from the API. This tile will light up once the endpoints
          land.
        </p>
      </CardContent>
    </Card>
  )
}
