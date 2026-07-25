export type ApiResponse<T> = {
  status: string
  message: string
  data: T | null
}

export type PaginatedEnvelope<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type TokenResponse = {
  access_token: string
  token_type?: string
}

export type UserPublic = {
  id: number
  email: string
  first_name: string
  last_name: string
  title: string
}

export type RegisterRequest = {
  email: string
  title: string
  first_name: string
  last_name: string
  password: string
}

export type Location = {
  id?: number | null
  name: string
  user_id?: number | null
  latitude?: number | null
  longitude?: number | null
}

export type LocationCreate = {
  name: string
  latitude: number
  longitude: number
}

export type Borehole = {
  id?: number | null
  name: string
  total_depth: number
  location_id?: number | null
  critical_low_level: number
  optimal_high_level: number
  soil_characteristic: string
  water_body_proximity: number
  topography: string
  created_at?: string
}

export type BoreholeCreate = {
  name: string
  total_depth: number
  location_id: number
  critical_low_level: number
  optimal_high_level: number
  soil_characteristic: string
  water_body_proximity: number
  topography: string
}

export type SensorType = "pressure_transducer" | "flow_meter" | "esp32"
export type SensorStatus = "active" | "inactive" | "faulty"

export type SensorPublic = {
  id: number
  borehole_id: number
  type: SensorType
  status: SensorStatus
  last_seen?: string | null
}

export type SensorCreate = {
  borehole_id: number
  type: SensorType
}

export type SensorCreateResponse = {
  sensor: SensorPublic
  device_key?: string | null
}

export type WaterLevelReading = {
  id?: number | null
  borehole_id?: number | null
  sensor_id?: number | null
  created_at: string
  water_level: number
}

export type FlowReading = {
  id?: number | null
  borehole_id?: number | null
  sensor_id?: number | null
  created_at: string
  abstraction_rate: number
}

export type Weather = {
  id?: number | null
  location_id?: number | null
  temperature?: number | null
  humidity?: number | null
  precipitation?: number | null
  created_at: string
}

export type PumpStatus = "on" | "off"
export type PumpAction = "turned_on" | "turned_off"
export type PumpTrigger =
  | "automatic_schedule"
  | "manual_override"
  | "critical_safety"

export type Pump = {
  id?: number | null
  borehole_id?: number | null
  status: PumpStatus
  power_rating: number
  depth: number
  last_status_change?: string | null
}

export type PumpHistory = {
  id?: number | null
  pump_id?: number | null
  action: PumpAction
  triggered_by: PumpTrigger
  created_at: string
}

export type StatusChange = { new_status: PumpStatus }

// POST /api/pumps/{borehole_id} returns both the updated pump and the
// history entry created for the transition.
export type PumpStatusChangeResponse = {
  pump: Pump
  pump_history: PumpHistory | null
}

export type ChartRange = "day" | "week" | "month"

// The chart endpoint returns aggregated points. `value` is nullable for
// empty buckets — for water level that's rare, for flow it's the normal
// case between pumping windows.
export type ChartPoint = {
  t: string
  value: number | null
}
