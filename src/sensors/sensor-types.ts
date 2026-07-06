import type { SensorType } from "@/lib/types"

export type SensorTypeMeta = {
  value: SensorType
  label: string
  hint: string
}

export const SENSOR_TYPES: SensorTypeMeta[] = [
  {
    value: "pressure_transducer",
    label: "Pressure transducer",
    hint: "Measures water level via hydrostatic pressure.",
  },
  {
    value: "flow_meter",
    label: "Flow meter",
    hint: "Measures pumped or recharged volume.",
  },
  {
    value: "esp32",
    label: "ESP32 controller",
    hint: "Wi-Fi bridge that reports on behalf of physical probes.",
  },
]

const BY_VALUE: Record<SensorType, SensorTypeMeta> = Object.fromEntries(
  SENSOR_TYPES.map((s) => [s.value, s]),
) as Record<SensorType, SensorTypeMeta>

export function sensorMeta(type: SensorType): SensorTypeMeta {
  return BY_VALUE[type]
}
