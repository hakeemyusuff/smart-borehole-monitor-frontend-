const TOKEN_KEY = "boresense.token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export type DecodedIdentity = {
  sub?: string
  email?: string
  first_name?: string
  last_name?: string
}

// Client-side JWT payload decode — NOT verification. We use this only to
// pull display fields (email, name) out of the token when the backend
// includes them as claims. If the token doesn't have them, the caller
// falls back to a generic "Signed in" label.
export function decodeIdentityFromToken(token: string): DecodedIdentity | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1]
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const normalized = padded.replace(/-/g, "+").replace(/_/g, "/")
    const json = JSON.parse(atob(normalized))
    return {
      sub: typeof json.sub === "string" ? json.sub : undefined,
      email: typeof json.email === "string" ? json.email : undefined,
      first_name: typeof json.first_name === "string" ? json.first_name : undefined,
      last_name: typeof json.last_name === "string" ? json.last_name : undefined,
    }
  } catch {
    return null
  }
}
