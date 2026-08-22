import { useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useCreatePump } from "@/pump/queries"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Install (create) a pump on a borehole. A borehole can have at most one
 * pump per the backend's GET /api/pumps/{borehole_id} contract, so this
 * is shown only when no pump exists yet.
 */
export function NewPumpDialog({
  boreholeId,
  trigger,
}: {
  boreholeId: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [powerRating, setPowerRating] = useState("")
  const [depth, setDepth] = useState("")
  const mutation = useCreatePump(boreholeId)

  const reset = () => {
    setPowerRating("")
    setDepth("")
    mutation.reset()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const pr = Number(powerRating)
    const d = Number(depth)
    if (!Number.isFinite(pr) || pr <= 0) {
      toast.error("Power rating must be a positive number")
      return
    }
    if (!Number.isFinite(d) || d <= 0) {
      toast.error("Depth must be a positive number")
      return
    }
    mutation.mutate(
      { borehole_id: boreholeId, power_rating: pr, depth: d },
      {
        onSuccess: () => {
          toast.success("Pump installed")
          setOpen(false)
          reset()
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.message : "Couldn't install pump"
          toast.error(msg)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) {
          setOpen(false)
          reset()
        } else if (next) {
          setOpen(true)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install pump</DialogTitle>
          <DialogDescription>
            Register the physical pump on this borehole. It starts in the
            OFF state; you can toggle it from the dashboard once installed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="power_rating">Power rating (kW)</Label>
            <Input
              id="power_rating"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              required
              placeholder="e.g. 1.5"
              value={powerRating}
              onChange={(e) => setPowerRating(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="depth">Installation depth (m)</Label>
            <Input
              id="depth"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              required
              placeholder="e.g. 45"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false)
                reset()
              }}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Installing…" : "Install pump"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
