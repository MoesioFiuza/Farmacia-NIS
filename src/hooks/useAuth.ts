import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'

export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'pharmacist'
}

const requireAuth = import.meta.env.VITE_REQUIRE_AUTH !== 'false'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!requireAuth) {
      return { id: 'local-development', name: 'Farmacêutico', role: 'admin' }
    }
    return null
  })
  const [loading, setLoading] = useState(requireAuth)

  useEffect(() => {
    if (!requireAuth) return

    apiClient
      .refresh()
      .then(() => apiClient.get<AuthUser>('/auth/me'))
      .then((authenticatedUser) => {
        setUser(authenticatedUser)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  return {
    user,
    loading,
    async login(email: string, password: string) {
      const authenticatedUser = await apiClient.login(email, password)
      setUser(authenticatedUser)
    },
    async logout() {
      await apiClient.logout()
      setUser(null)
    },
  }
}
