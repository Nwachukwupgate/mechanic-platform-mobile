import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function configureAndroidNotificationChannel() {
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
}

export async function ensurePushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

function resolveEASProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra
  const eas = extra && typeof extra === 'object' && 'eas' in extra ? (extra as { eas?: { projectId?: string } }).eas : undefined
  return eas?.projectId ?? Constants.easConfig?.projectId
}

export async function getExpoPushTokenOrNull(): Promise<string | null> {
  if (!Device.isDevice) return null
  const projectId = resolveEASProjectId()
  if (!projectId) {
    console.warn('[push] Missing EAS projectId in app config (extra.eas.projectId)')
    return null
  }
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId })
    return result.data ?? null
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed', e)
    return null
  }
}
