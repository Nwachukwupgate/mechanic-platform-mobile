import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Alert, Platform } from 'react-native'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GARAGE_PING_SOUND } from '../constants/notificationSound'

const PRIMER_SEEN_KEY = 'push_permission_primer_seen_v1'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function configureAndroidNotificationChannels() {
  if (Platform.OS !== 'android') return
  void Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16a34a',
    sound: GARAGE_PING_SOUND,
  })
  void Notifications.setNotificationChannelAsync('bookings', {
    name: 'Jobs & quotes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16a34a',
    sound: GARAGE_PING_SOUND,
  })
  void Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#16a34a',
    sound: GARAGE_PING_SOUND,
  })
}

export async function ensurePushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  })
  return status === 'granted'
}

/** One-time in-app explanation before the system permission dialog. */
export async function requestPushPermissionsWithPrimer(): Promise<boolean> {
  if (!Device.isDevice) return false

  const seen = await AsyncStorage.getItem(PRIMER_SEEN_KEY)
  if (!seen) {
    await new Promise<void>((resolve) => {
      Alert.alert(
        'Stay in the loop',
        'Allow notifications to get instant alerts for new quotes, messages, and job updates — even when your phone is locked.',
        [{ text: 'Continue', onPress: () => resolve() }],
        { cancelable: false },
      )
    })
    await AsyncStorage.setItem(PRIMER_SEEN_KEY, '1')
  }

  return ensurePushPermissions()
}

function resolveEASProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra
  const eas =
    extra && typeof extra === 'object' && 'eas' in extra
      ? (extra as { eas?: { projectId?: string } }).eas
      : undefined
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
