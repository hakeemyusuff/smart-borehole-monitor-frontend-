import { clearToken, getToken } from "@/lib/auth-token"
import type { ApiResponse } from "@/lib/types"

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  formBody?: URLSearchParams
  headers?: Record<string, string>
  auth?: boolean
}

async function request<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, formBody, headers = {}, auth = true } = opts

  const finalHeaders: Record<string, string> = { ...headers }
  let finalBody: BodyInit | undefined

  if (formBody) {
    finalHeaders["Content-Type"] = "application/x-www-form-urlencoded"
    finalBody = formBody
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json"
    finalBody = JSON.stringify(body)
  }

  if (auth) {
    const token = getToken()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  })

  const contentType = res.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? ((await res.json()) as ApiResponse<T> & { detail?: string })
    : null

  // A 401 from an authenticated request means the session died mid-flight —
  // clear the token and bounce to /login. A 401 from an unauthenticated
  // request (login/register) is just "wrong credentials" and must surface
  // the backend's real message instead of the session-expired copy.
  if (res.status === 401 && auth) {
    clearToken()
    if (window.location.pathname !== "/login") {
      window.location.assign("/login")
    }
    throw new ApiError(
      payload?.message ?? "Session expired. Please log in again.",
      401,
    )
  }

  if (!res.ok) {
    const message =
      payload?.message ?? payload?.detail ?? `Request failed with ${res.status}`
    throw new ApiError(message, res.status)
  }

  if (!payload) {
    throw new ApiError("Empty response from server", res.status)
  }

  return (payload.data ?? null) as T
}

export const api = {
  get: <T>(path: string, opts?: Omit<ApiFetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<ApiFetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  postForm: <T>(path: string, formBody: URLSearchParams, opts?: Omit<ApiFetchOptions, "method" | "body" | "formBody">) =>
    request<T>(path, { ...opts, method: "POST", formBody }),
  put: <T>(path: string, body?: unknown, opts?: Omit<ApiFetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: Omit<ApiFetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
}
