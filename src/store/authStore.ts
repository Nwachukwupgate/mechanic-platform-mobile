import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants/storage'
import { API_BASE_URL } from '../config/apiBaseUrl'

export interface User {
  id: string
  email: string
  role: 'USER' | 'MECHANIC' | 'ADMIN'
  firstName?: string
  lastName?: string
  companyName?: string
  ownerFullName?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  hydrated: boolean
  justLoggedIn: boolean
  setAuth: (user: User, token: string) => void
  clearJustLoggedIn: () => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  justLoggedIn: false,

  setAuth: (user, token) => {
    const data = { user, token, isAuthenticated: true, justLoggedIn: true }
    set(data)
    void AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ user, token, isAuthenticated: true }))
  },

  clearJustLoggedIn: () => set({ justLoggedIn: false }),

  logout: () => {
    const { user, token } = get()
    set({ user: null, token: null, isAuthenticated: false, justLoggedIn: false })
    void AsyncStorage.removeItem(STORAGE_KEYS.AUTH)

    if (user && token && (user.role === 'USER' || user.role === 'MECHANIC')) {
      const path =
        user.role === 'USER' ? '/users/me/push-token' : '/mechanics/me/push-token'
      void fetch(`${API_BASE_URL}${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: null }),
      }).catch(() => {})
    }
  },

  hydrate: () => {
    AsyncStorage.getItem(STORAGE_KEYS.AUTH)
      .then((raw) => {
        if (!raw) return
        const { user, token, isAuthenticated } = JSON.parse(raw)
        if (user && token) set({ user, token, isAuthenticated: isAuthenticated !== false })
      })
      .catch(() => {})
      .then(() => {
        set({ hydrated: true })
      })
  },
}))
