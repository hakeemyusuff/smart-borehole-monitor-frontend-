import { useState, type FormEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useCreateLocation } from "@/locations/queries"
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

const EMPTY = { name: "", latitude: "", longitude: "" }

export function NewLocationDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const navigate = useNavigate()
  const mutation = useCreateLocation()

  const reset = () => {
    setForm(EMPTY)
    mutation.reset()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitude and longitude must be numbers")
      return
    }
    mutation.mutate(
      { name: form.name.trim(), latitude: lat, longitude: lng },
      {
        onSuccess: (loc) => {
          toast.success(`Location "${loc.name}" created`)
          setOpen(false)
          reset()
          if (loc.id !== null && loc.id !== undefined) {
            navigate(`/locations/${loc.id}`)
          }
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Could not create location")
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New location</DialogTitle>
          <DialogDescription>
            A location is a site on a map. Boreholes live inside it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-name">Name</Label>
            <Input
              id="loc-name"
              placeholder="e.g. Aquifer Ridge"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-lat">Latitude</Label>
              <Input
                id="loc-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                placeholder="-1.286389"
                required
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-lng">Longitude</Label>
              <Input
                id="loc-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                placeholder="36.817223"
                required
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
