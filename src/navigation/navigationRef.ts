import { createNavigationContainerRef } from '@react-navigation/native'

export const navigationRef = createNavigationContainerRef()

export function navigateFromNotificationData(
  data: Record<string, unknown> | undefined,
  role: 'USER' | 'MECHANIC' | undefined,
) {
  if (!data || !navigationRef.isReady() || !role) return
  const bookingId = typeof data.bookingId === 'string' ? data.bookingId : null
  if (!bookingId) return

  if (role === 'MECHANIC') {
    navigationRef.navigate('MechanicBookingDetail' as never, { id: bookingId } as never)
  } else {
    navigationRef.navigate('BookingDetail' as never, { id: bookingId } as never)
  }
}
