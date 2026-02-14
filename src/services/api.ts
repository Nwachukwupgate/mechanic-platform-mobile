import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error || typeof error !== 'object') return fallback
  const ax = error as AxiosError<{ message?: string | string[] }>
  const data = ax.response?.data
  if (data?.message) {
    const msg = data.message
    if (Array.isArray(msg) && msg.length) return msg.join('. ')
    if (typeof msg === 'string') return msg
  }
  if (ax.response?.status === 401) return 'Please sign in again.'
  return fallback
}

export const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '')
      const isAuthLogin = url.indexOf('/auth/login') !== -1
      const isAuthRegister = url.indexOf('/auth/register') !== -1
      if (!isAuthLogin && !isAuthRegister) useAuthStore.getState().logout()
    }
    throw error
  }
)

export const authAPI = {
  registerUser: (d: { firstName: string; lastName: string; email: string; dateOfBirth: string; password: string }) =>
    api.post('/auth/register/user', d),
  registerMechanic: (d: { companyName: string; ownerFullName: string; email: string; password: string }) =>
    api.post('/auth/register/mechanic', d),
  loginUser: (email: string, password: string) => api.post('/auth/login/user', { email, password }),
  loginMechanic: (email: string, password: string) => api.post('/auth/login/mechanic', { email, password }),
  getMe: () => api.get('/auth/me'),
}

export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (d: object) => api.put('/users/me/profile', d),
}

export const mechanicsAPI = {
  getProfile: () => api.get('/mechanics/me/profile'),
  updateProfile: (d: object) => api.put('/mechanics/me/profile', d),
  updateAvailability: (a: boolean) => api.put('/mechanics/me/availability', { availability: a }),
}

export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  create: (d: object) => api.post('/vehicles', d),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
}

export const faultsAPI = { getAll: () => api.get('/faults') }

export const bookingsAPI = {
  create: (d: object) => api.post('/bookings', d),
  getAll: () => api.get('/bookings'),
  getById: (id: string) => api.get(`/bookings/${id}`),
  findNearbyMechanics: (lat: number, lng: number, faultCategory: string, radius?: number, vehicleId?: string) =>
    api.get('/bookings/nearby-mechanics', { params: { lat, lng, faultCategory, radius, vehicleId } }),
  acceptBooking: (id: string) => api.put(`/bookings/${id}/accept`),
  updateStatus: (id: string, status: string) => api.put(`/bookings/${id}/status`, { status }),
  updateCost: (id: string, cost: number) => api.put(`/bookings/${id}/cost`, { cost }),
}

export const ratingsAPI = { create: (d: object) => api.post('/ratings', d) }
