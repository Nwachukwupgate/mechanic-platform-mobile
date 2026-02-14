import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants/storage'

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
  setAuth: (user: User, token: string) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: (user, token) => {
    const data = { user, token, isAuthenticated: true }
    set(data)
    void AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(data))
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false })
    void AsyncStorage.removeItem(STORAGE_KEYS.AUTH)
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
