import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../store/authStore'
import { navigateFromNotificationData } from '../navigation/navigationRef'

function dataFromResponse(
  response: Notifications.NotificationResponse | null | undefined,
): Record<string, unknown> | undefined {
  const raw = response?.notification?.request?.content?.data
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  return undefined
}

/** Open the relevant booking when user taps a lock-screen / banner notification. */
export function usePushNotificationNavigation(isAuthenticated: boolean) {
  const role = useAuthStore((s) => s.user?.role)

  useEffect(() => {
    if (!isAuthenticated || (role !== 'USER' && role !== 'MECHANIC')) return

    const openFromResponse = (response: Notifications.NotificationResponse | null) => {
      const data = dataFromResponse(response)
      if (data?.bookingId) {
        navigateFromNotificationData(data, role)
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) openFromResponse(last)
    })

    const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse)
    return () => sub.remove()
  }, [isAuthenticated, role])
}
