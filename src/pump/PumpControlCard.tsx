import { useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { usePump, useChangePumpStatus } from "@/pump/queries"
import type { Pump, PumpStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Live pump status + manual toggle for a single borehole. Replaces the
 * old placeholder tile. The toggle drives a physical pump, so it goes
 * through a confirmation dialog and waits for the server (no optimistic
 * flip).
 */
export function PumpControlCard({ boreholeId }: { boreholeId: number }) {
  const query = usePump(boreholeId)
  const change = useChangePumpStatus(boreholeId)
  const [confirmingTo, setConfirmingTo] = useState<PumpStatus | null>(null)

  if (query.isPending) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Pump status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError || !query.data) {
    const message =
      query.error instanceof ApiError
        ? query.error.message
        : "Couldn't load pump."
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Pump status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {query.isError ? message : "No pump installed on this borehole."}
          </p>
          {query.isError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
            >
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const pump = query.data
  const nextStatus: PumpStatus = pump.status === "on" ? "off" : "on"

  const onConfirm = () => {
    if (confirmingTo === null) return
    change.mutate(confirmingTo, {
      onSuccess: (res) => {
        toast.success(
          `Pump ${res.pump.status === "on" ? "turned on" : "turned off"}`,
        )
        setConfirmingTo(null)
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.message : "Couldn't change pump status"
        toast.error(msg)
      },
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="w-full flex items-center justify-between gap-4">
          <CardTitle className="font-heading text-xl">Pump status</CardTitle>
          {/* The switch stays at the CURRENT status until the user confirms
              the change. Clicking opens the confirmation dialog; the
              onCheckedChange never runs directly against the mutation. */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={pump.status === "on"}
              aria-label={
                pump.status === "on" ? "Turn pump off" : "Turn pump on"
              }
              disabled={change.isPending}
              onClick={() => setConfirmingTo(nextStatus)}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                pump.status === "on" ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
                  pump.status === "on" ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
            <span
              className={`text-[10px] uppercase tracking-[0.16em] font-medium [font-variant-numeric:tabular-nums] ${pump.status === "on" ? "text-primary" : "text-muted-foreground"}`}
            >
              {pump.status === "on" ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PumpMeta pump={pump} />
      </CardContent>

      <Dialog
        open={confirmingTo !== null}
        onOpenChange={(open) => {
          if (!open && !change.isPending) setConfirmingTo(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmingTo === "on" ? "Turn pump ON?" : "Turn pump OFF?"}
            </DialogTitle>
            <DialogDescription>
              This sends a command to the physical pump. It will be recorded
              in the pump history as a manual override.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmingTo(null)}
              disabled={change.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmingTo === "off" ? "outline" : "default"}
              onClick={onConfirm}
              disabled={change.isPending}
            >
              {change.isPending
                ? "Sending…"
                : confirmingTo === "on"
                  ? "Turn ON"
                  : "Turn OFF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function PumpMeta({ pump }: { pump: Pump }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
      <p>
        Since{" "}
        <span className="text-foreground">
          {pump.last_status_change
            ? relativeTime(pump.last_status_change)
            : "—"}
        </span>
      </p>
      <p>
        {pump.power_rating}&nbsp;kW · installed at{" "}
        {pump.depth}&nbsp;m
      </p>
    </div>
  )
}

// "since 4:02 PM" for today, otherwise "since Jul 24, 4:02 PM".
function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
