import { Navigate, Route, Routes } from "react-router-dom"
import { LoginPage } from "@/auth/LoginPage"
import { RegisterPage } from "@/auth/RegisterPage"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { AppLayout } from "@/components/AppLayout"
import { LocationsPage } from "@/locations/LocationsPage"
import { LocationDetailPage } from "@/locations/LocationDetailPage"
import { BoreholeDetailPage } from "@/boreholes/BoreholeDetailPage"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/locations" replace />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:id" element={<LocationDetailPage />} />
          <Route path="/boreholes/:id" element={<BoreholeDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
