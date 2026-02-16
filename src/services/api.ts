import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://mechanic.internalops.pro'

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error || typeof error !== 'object') return fallback
  const ax = error as AxiosError<{
    message?: string | string[]
    error?: string
    statusCode?: number
  }>
  const data = ax.response?.data
  const status = ax.response?.status
  if (data && typeof data === 'object') {
    const msg = data.message
    if (Array.isArray(msg) && msg.length > 0) {
      const text = msg.map((m) => (typeof m === 'string' ? m : String(m))).join('. ')
      return text || fallback
    }
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    if (typeof data.error === 'string' && data.error.trim()) {
      return status === 400 ? `Bad request: ${data.error}` : data.error
    }
  }
  if (status === 401) return 'Please sign in again.'
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return 'Not found. It may have been removed.'
  if (typeof status === 'number' && status >= 500) return 'Server error. Please try again later.'
  if (ax.message && typeof ax.message === 'string' && ax.message.trim()) return ax.message.trim()
  return fallback
}

export function isPropertyNotAllowedError(error: unknown, propertyName?: string): boolean {
  const msg = getApiErrorMessage(error, '')
  if (!msg) return false
  const lower = msg.toLowerCase()
  const hasPropertyReject = lower.includes('should not exist') || lower.includes('property')
  if (!propertyName) return hasPropertyReject
  return hasPropertyReject && lower.includes(propertyName.toLowerCase())
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

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
      const isAuthRoute =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/verify-email')
      if (!isAuthRoute) useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  registerUser: (d: {
    firstName: string
    lastName: string
    email: string
    dateOfBirth: string
    password: string
  }) => api.post('/auth/register/user', d),
  registerMechanic: (d: {
    companyName: string
    ownerFullName: string
    email: string
    password: string
  }) => api.post('/auth/register/mechanic', d),
  loginUser: (email: string, password: string) =>
    api.post('/auth/login/user', { email, password }),
  loginMechanic: (email: string, password: string) =>
    api.post('/auth/login/mechanic', { email, password }),
  verifyEmail: (token: string, role: string) =>
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`),
  getMe: () => api.get('/auth/me'),
}

export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (d: object) => api.put('/users/me/profile', d),
}

export const mechanicsAPI = {
  getAll: () => api.get('/mechanics'),
  getById: (id: string) => api.get(`/mechanics/${id}`),
  getProfile: () => api.get('/mechanics/me/profile'),
  updateProfile: (d: object) => api.put('/mechanics/me/profile', d),
  updateAvailability: (a: boolean) =>
    api.put('/mechanics/me/availability', { availability: a }),
  uploadCertificate: (file: File | { uri: string; name: string; type: string }) => {
    const formData = new FormData()
    formData.append('file', file as any)
    return api.post<{ certificateUrl: string }>('/mechanics/me/upload-certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadAvatar: (file: File | { uri: string; name: string; type: string }) => {
    const formData = new FormData()
    formData.append('file', file as any)
    return api.post<{ avatarUrl: string }>('/mechanics/me/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  listBankAccounts: () =>
    api.get<
      Array<{
        id: string
        bankCode: string
        bankName: string
        accountNumber: string
        accountName: string
        isDefault: boolean
      }>
    >('/mechanics/me/bank-accounts'),
  addBankAccount: (d: {
    bankCode: string
    bankName: string
    accountNumber: string
    accountName: string
    isDefault?: boolean
  }) => api.post('/mechanics/me/bank-accounts', d),
  updateBankAccount: (
    accountId: string,
    d: {
      bankCode?: string
      bankName?: string
      accountNumber?: string
      accountName?: string
      isDefault?: boolean
    }
  ) => api.put(`/mechanics/me/bank-accounts/${accountId}`, d),
  setDefaultBankAccount: (accountId: string) =>
    api.put(`/mechanics/me/bank-accounts/${accountId}/default`),
  deleteBankAccount: (accountId: string) =>
    api.delete(`/mechanics/me/bank-accounts/${accountId}`),
}

export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  create: (d: object) => api.post('/vehicles', d),
  update: (id: string, d: object) => api.put(`/vehicles/${id}`, d),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
}

export const faultsAPI = {
  getAll: (category?: string) =>
    api.get('/faults', { params: category ? { category } : {} }),
  getById: (id: string) => api.get(`/faults/${id}`),
}

export const bookingsAPI = {
  create: (d: object) => api.post('/bookings', d),
  getAll: () => api.get('/bookings'),
  getById: (id: string) => api.get(`/bookings/${id}`),
  findNearbyMechanics: (
    lat: number,
    lng: number,
    faultCategory: string,
    radius?: number,
    vehicleId?: string
  ) =>
    api.get('/bookings/nearby-mechanics', {
      params: { lat, lng, faultCategory, radius, vehicleId },
    }),
  acceptBooking: (id: string) => api.put(`/bookings/${id}/accept`),
  updateStatus: (id: string, status: string) =>
    api.put(`/bookings/${id}/status`, { status }),
  updateCost: (id: string, cost: number) =>
    api.put(`/bookings/${id}/cost`, { cost }),
  getOpenRequests: (radius?: number) =>
    api.get('/bookings/open-requests', { params: radius != null ? { radius } : {} }),
  getQuotes: (bookingId: string) => api.get(`/bookings/${bookingId}/quotes`),
  createQuote: (
    bookingId: string,
    data: { proposedPrice: number; message?: string }
  ) => api.post(`/bookings/${bookingId}/quotes`, data),
  updateQuote: (
    bookingId: string,
    quoteId: string,
    data: { proposedPrice: number }
  ) => api.put(`/bookings/${bookingId}/quotes/${quoteId}`, data),
  withdrawQuote: (bookingId: string, quoteId: string) =>
    api.put(`/bookings/${bookingId}/quotes/${quoteId}/withdraw`),
  rejectQuote: (bookingId: string, quoteId: string) =>
    api.put(`/bookings/${bookingId}/quotes/${quoteId}/reject`),
  acceptQuote: (bookingId: string, quoteId: string) =>
    api.put(`/bookings/${bookingId}/quotes/${quoteId}/accept`),
  updateDescription: (bookingId: string, description: string | null) =>
    api.put(`/bookings/${bookingId}/description`, { description }),
  addClarification: (bookingId: string, question: string) =>
    api.post(`/bookings/${bookingId}/clarifications`, { question }),
  answerClarification: (clarificationId: string, answer: string) =>
    api.put(`/bookings/clarifications/${clarificationId}/answer`, { answer }),
}

export const ratingsAPI = {
  create: (d: object) => api.post('/ratings', d),
  getMechanicRatings: (mechanicId: string) =>
    api.get(`/ratings/mechanic/${mechanicId}`),
  getMechanicAverage: (mechanicId: string) =>
    api.get<{ average?: number }>(`/ratings/mechanic/${mechanicId}/average`),
}

export const walletAPI = {
  getBanks: () =>
    api.get<Array<{ code: string; name: string }>>('/wallet/banks'),
  initializePayment: (bookingId: string) =>
    api.post<{
      authorizationUrl: string
      accessCode: string
      reference: string
    }>('/wallet/initialize-payment', { bookingId }),
  verifyPayment: (reference: string) =>
    api.post<{ success: boolean; booking: any }>('/wallet/verify-payment', {
      reference,
    }),
  markDirectPaid: (bookingId: string) =>
    api.post('/wallet/mark-direct-paid', { bookingId }),
  getTransactions: (params?: {
    type?: string
    limit?: number
    offset?: number
  }) =>
    api.get<{ items: any[]; total: number; limit: number; offset: number }>(
      '/wallet/transactions',
      { params }
    ),
  getBalance: () =>
    api.get<{
      balanceMinor: number
      balanceNaira: number
      currency: string
      totalEarnedFromPlatformMinor: number
      totalPayoutsMinor: number
    }>('/wallet/balance'),
  getOwing: () =>
    api.get<{
      owingMinor: number
      owingNaira: number
      currency: string
      totalFeeOwedMinor: number
      totalFeePaidMinor: number
    }>('/wallet/owing'),
  getSummary: () =>
    api.get<{
      balance: { balanceNaira: number; balanceMinor: number }
      owing: { owingNaira: number }
      recentTransactions: any[]
    }>('/wallet/summary'),
  withdraw: (amountMinor: number) => api.post('/wallet/withdraw', { amountMinor }),
}
