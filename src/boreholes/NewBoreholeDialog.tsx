import { useState, type FormEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useCreateBorehole } from "@/boreholes/queries"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TOPOGRAPHY_OPTIONS = ["flat", "sloped", "hilly", "valley", "elevated"]

type FormState = {
  name: string
  total_depth: string
  critical_low_level: string
  optimal_high_level: string
  soil_characteristic: string
  water_body_proximity: string
  topography: string
}

const EMPTY: FormState = {
  name: "",
  total_depth: "",
  critical_low_level: "",
  optimal_high_level: "",
  soil_characteristic: "",
  water_body_proximity: "",
  topography: "",
}

export function NewBoreholeDialog({
  locationId,
  trigger,
}: {
  locationId: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const navigate = useNavigate()
  const mutation = useCreateBorehole()

  const reset = () => {
    setForm(EMPTY)
    mutation.reset()
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const numeric = {
      total_depth: Number(form.total_depth),
      critical_low_level: Number(form.critical_low_level),
      optimal_high_level: Number(form.optimal_high_level),
      water_body_proximity: Number(form.water_body_proximity),
    }
    if (Object.values(numeric).some(Number.isNaN)) {
      toast.error("Depth, thresholds, and proximity must be numbers")
      return
    }
    if (numeric.critical_low_level >= numeric.optimal_high_level) {
      toast.error("Critical low level must be below optimal high level")
      return
    }

    mutation.mutate(
      {
        name: form.name.trim(),
        location_id: locationId,
        ...numeric,
        soil_characteristic: form.soil_characteristic.trim(),
        topography: form.topography,
      },
      {
        onSuccess: (bh) => {
          toast.success(`Borehole "${bh.name}" registered`)
          setOpen(false)
          reset()
          if (bh.id !== null && bh.id !== undefined) {
            navigate(`/boreholes/${bh.id}`)
          }
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Could not create borehole")
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register a borehole</DialogTitle>
          <DialogDescription>
            Physical measurements let the app translate raw sensor readings into water levels.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bh-name">Name</Label>
            <Input
              id="bh-name"
              placeholder="e.g. BH-01"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumField
              id="bh-depth"
              label="Total depth (m)"
              placeholder="45"
              value={form.total_depth}
              onChange={(v) => update("total_depth", v)}
              step="0.1"
              min={0}
            />
            <NumField
              id="bh-proximity"
              label="Water body proximity (m)"
              placeholder="120"
              value={form.water_body_proximity}
              onChange={(v) => update("water_body_proximity", v)}
              step="0.1"
              min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumField
              id="bh-low"
              label="Critical low level (m)"
              placeholder="8"
              value={form.critical_low_level}
              onChange={(v) => update("critical_low_level", v)}
              step="0.1"
              min={0}
            />
            <NumField
              id="bh-high"
              label="Optimal high level (m)"
              placeholder="35"
              value={form.optimal_high_level}
              onChange={(v) => update("optimal_high_level", v)}
              step="0.1"
              min={0}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bh-soil">Soil characteristic</Label>
            <Input
              id="bh-soil"
              placeholder="e.g. sandy loam"
              required
              value={form.soil_characteristic}
              onChange={(e) => update("soil_characteristic", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bh-topo">Topography</Label>
            <Select
              value={form.topography}
              onValueChange={(v) => update("topography", v)}
            >
              <SelectTrigger id="bh-topo">
                <SelectValue placeholder="Select topography" />
              </SelectTrigger>
              <SelectContent>
                {TOPOGRAPHY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt[0].toUpperCase() + opt.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !form.topography}
            >
              {mutation.isPending ? "Registering…" : "Register borehole"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NumField({
  id,
  label,
  placeholder,
  value,
  onChange,
  step,
  min,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  step: string
  min: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        min={min}
        placeholder={placeholder}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
