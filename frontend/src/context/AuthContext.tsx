import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'

type Role = 'student' | 'teacher' | 'admin'

interface User {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  initializing: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setInitializing(false)
      return
    }
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_role')
      })
      .finally(() => setInitializing(false))
  }, [])

  async function login(email: string, password: string) {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)

      const me = await api.get<User>('/auth/me')
      localStorage.setItem('user_role', me.data.role)
      setUser(me.data)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_role')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, loading, initializing }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
