import { useEffect, useRef } from 'react'
import {
  configureAndroidNotificationChannels,
  requestPushPermissionsWithPrimer,
  getExpoPushTokenOrNull,
} from '../services/pushNotifications'
import { configureAlertNotificationChannels } from '../services/alertNotifications'
import { usersAPI, mechanicsAPI } from '../services/api'
import type { User } from '../store/authStore'

/**
 * After login, registers for Expo push and sends the token to the API.
 * Mechanics must use mechanicsAPI; customers use usersAPI.
 */
export function useSyncExpoPushToken(user: User | null | undefined, isAuthenticated: boolean) {
  const lastSentRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      lastSentRef.current = null
      return
    }
    if (user.role !== 'USER' && user.role !== 'MECHANIC') return

    let cancelled = false

    void (async () => {
      configureAndroidNotificationChannels()
      configureAlertNotificationChannels()
      const granted = await requestPushPermissionsWithPrimer()
      if (!granted || cancelled) return

      const expoToken = await getExpoPushTokenOrNull()
      if (!expoToken || cancelled) return
      if (lastSentRef.current === expoToken) return

      try {
        if (user.role === 'USER') {
          await usersAPI.setPushToken(expoToken)
        } else {
          await mechanicsAPI.setPushToken(expoToken)
        }
        if (!cancelled) lastSentRef.current = expoToken
      } catch {
        // keep trying on next mount / login
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, user?.role])
}
