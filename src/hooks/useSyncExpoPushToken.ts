import { useEffect, useRef, useCallback } from 'react'
import { AppState } from 'react-native'
import {
  configureAndroidNotificationChannels,
  configureAlertNotificationChannels,
  requestPushPermissionsWithPrimer,
  getExpoPushTokenOrNull,
} from '../services/pushNotifications'
import { usersAPI, mechanicsAPI } from '../services/api'
import type { User } from '../store/authStore'

/**
 * After login, registers for Expo push and sends the token to the API.
 * Re-syncs when the app returns to foreground (permission may have changed in Settings).
 */
export function useSyncExpoPushToken(user: User | null | undefined, isAuthenticated: boolean) {
  const lastSentRef = useRef<string | null>(null)

  const syncToken = useCallback(async () => {
    if (!user || (user.role !== 'USER' && user.role !== 'MECHANIC')) return

    configureAndroidNotificationChannels()
    configureAlertNotificationChannels()

    const granted = await requestPushPermissionsWithPrimer()
    if (!granted) return

    const expoToken = await getExpoPushTokenOrNull()
    if (!expoToken) return
    if (lastSentRef.current === expoToken) return

    try {
      if (user.role === 'USER') {
        await usersAPI.setPushToken(expoToken)
      } else {
        await mechanicsAPI.setPushToken(expoToken)
      }
      lastSentRef.current = expoToken
    } catch (e) {
      console.warn('[push] failed to register token with API', e)
    }
  }, [user])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      lastSentRef.current = null
      return
    }

    void syncToken()

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncToken()
      }
    })

    return () => sub.remove()
  }, [isAuthenticated, user?.id, user?.role, syncToken])
}
