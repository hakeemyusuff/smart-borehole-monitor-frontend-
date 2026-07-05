import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { clearToken, getToken, setToken } from "@/lib/auth-token"
import { AuthContext, type AuthContextValue } from "@/auth/auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const queryClient = useQueryClient()

  const login = useCallback((next: string) => {
    setToken(next)
    setTokenState(next)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ token, isAuthenticated: token !== null, login, logout }),
    [token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
