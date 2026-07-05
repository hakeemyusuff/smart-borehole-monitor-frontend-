import { Navigate, Route, Routes } from "react-router-dom"
import { LoginPage } from "@/auth/LoginPage"
import { RegisterPage } from "@/auth/RegisterPage"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { HomePage } from "@/components/HomePage"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
