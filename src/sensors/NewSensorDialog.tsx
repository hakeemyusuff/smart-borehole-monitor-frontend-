import { useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import type { SensorType } from "@/lib/types"
import { useCreateSensor } from "@/sensors/queries"
import { SENSOR_TYPES, sensorMeta } from "@/sensors/sensor-types"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function NewSensorDialog({
  boreholeId,
  trigger,
}: {
  boreholeId: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<SensorType | "">("")
  const [deviceKey, setDeviceKey] = useState<string | null>(null)
  const mutation = useCreateSensor(boreholeId)

  const reset = () => {
    setType("")
    mutation.reset()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!type) {
      toast.error("Pick a sensor type first")
      return
    }
    mutation.mutate(
      { borehole_id: boreholeId, type },
      {
        onSuccess: (res) => {
          if (res.device_key) {
            setDeviceKey(res.device_key)
            toast.success("Sensor registered — copy the device key")
          } else {
            toast.success(`${sensorMeta(res.sensor.type).label} registered`)
            setOpen(false)
            reset()
          }
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError ? err.message : "Could not register sensor",
          )
        },
      },
    )
  }

  const closeAll = () => {
    setDeviceKey(null)
    setOpen(false)
    reset()
  }

  return (
    <>
      <Dialog
        open={open && !deviceKey}
        onOpenChange={(next) => {
          if (!deviceKey) {
            setOpen(next)
            if (!next) reset()
          }
        }}
      >
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register a sensor</DialogTitle>
            <DialogDescription>
              Pick the sensor type. If the type needs a device key, we'll show it once after
              creation — copy it before closing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sensor-type">Sensor type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as SensorType)}
              >
                <SelectTrigger id="sensor-type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {SENSOR_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type && (
                <p className="text-xs text-muted-foreground">
                  {sensorMeta(type).hint}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || !type}>
                {mutation.isPending ? "Registering…" : "Register sensor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeviceKeyDialog deviceKey={deviceKey} onClose={closeAll} />
    </>
  )
}

function DeviceKeyDialog({
  deviceKey,
  onClose,
}: {
  deviceKey: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!deviceKey) return
    try {
      await navigator.clipboard.writeText(deviceKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Couldn't copy — copy it manually")
    }
  }

  return (
    <Dialog open={deviceKey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Device key generated</DialogTitle>
          <DialogDescription>
            This key authenticates the physical device to the backend. It will not be shown
            again — copy it into your firmware config now.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex items-center justify-between gap-3">
            <code className="text-sm text-foreground break-all font-mono">
              {deviceKey}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copy}
              className="shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Store this alongside your device id in the ESP32's flash configuration.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            I've stored the key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

