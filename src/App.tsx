import { Navigate, Route, Routes } from "react-router-dom"
import { LoginPage } from "@/auth/LoginPage"
import { RegisterPage } from "@/auth/RegisterPage"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { AppLayout } from "@/components/AppLayout"
import { DashboardPage } from "@/dashboard/DashboardPage"
import { LocationsPage } from "@/locations/LocationsPage"
import { LocationDetailPage } from "@/locations/LocationDetailPage"
import { BoreholeDetailPage } from "@/boreholes/BoreholeDetailPage"
import { SensorDetailPage } from "@/sensors/SensorDetailPage"
import { DataLogsPage } from "@/data-logs/DataLogsPage"
import { PumpPage } from "@/pump/PumpPage"
import { LandingPage } from "@/landing/LandingPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:id" element={<LocationDetailPage />} />
          <Route path="/boreholes/:id" element={<BoreholeDetailPage />} />
          <Route
            path="/boreholes/:boreholeId/sensors/:sensorId"
            element={<SensorDetailPage />}
          />
          <Route path="/pump" element={<PumpPage />} />
          <Route path="/data-logs" element={<DataLogsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
