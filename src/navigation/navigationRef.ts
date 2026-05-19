import { createNavigationContainerRef, type ParamListBase } from '@react-navigation/native'

export const navigationRef = createNavigationContainerRef<ParamListBase>()

export function navigateFromNotificationData(
  data: Record<string, unknown> | undefined,
  role: 'USER' | 'MECHANIC' | undefined,
) {
  if (!data || !navigationRef.isReady() || !role) return
  const bookingId = typeof data.bookingId === 'string' ? data.bookingId : null
  if (!bookingId) return

  if (role === 'MECHANIC') {
    navigationRef.navigate('MechanicBookingDetail', { id: bookingId })
  } else {
    navigationRef.navigate('BookingDetail', { id: bookingId })
  }
}
