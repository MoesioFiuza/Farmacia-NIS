const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

let accessToken: string | null = null
let refreshToken: string | null = null

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })

  if (response.status === 401 && retryAfterRefresh && path !== '/auth/refresh') {
    const refreshed = await apiClient.refresh().catch(() => false)
    if (refreshed) return request<T>(path, init, false)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      body?.error ?? body?.message ?? 'Não foi possível concluir a operação.',
      response.status,
      body,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const apiClient = {
  async login(email: string, password: string) {
    const result = await request<{
      accessToken: string
      refreshToken: string
      user: { id: string; email: string; role: 'admin' | 'pharmacist' }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    accessToken = result.accessToken
    refreshToken = result.refreshToken
    return { ...result.user, name: result.user.email }
  },

  async refresh() {
    if (!refreshToken) return false
    const result = await request<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      false,
    )
    accessToken = result.accessToken
    refreshToken = result.refreshToken
    return true
  },

  async logout() {
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined)
    }
    accessToken = null
    refreshToken = null
  },

  get<T>(path: string) {
    return request<T>(path)
  },

  post<T>(path: string, body: unknown) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  },
}
