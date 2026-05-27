import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Alert, Platform } from 'react-native'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  GARAGE_PING_SOUND,
  ANDROID_ALERTS_CHANNEL,
  ANDROID_BOOKINGS_CHANNEL,
  ANDROID_DEFAULT_CHANNEL,
  ANDROID_MESSAGES_CHANNEL,
} from '../constants/notificationSound'

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

function androidChannelSound() {
  return GARAGE_PING_SOUND
}

export function configureAndroidNotificationChannels() {
  if (Platform.OS !== 'android') return

  const sound = androidChannelSound()
  const channelBase = {
    sound,
    enableVibrate: true,
    lightColor: '#16a34a',
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  }

  void Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    ...channelBase,
  })
  void Notifications.setNotificationChannelAsync(ANDROID_BOOKINGS_CHANNEL, {
    name: 'Jobs & quotes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    ...channelBase,
  })
  void Notifications.setNotificationChannelAsync(ANDROID_MESSAGES_CHANNEL, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    ...channelBase,
  })
}

export function configureAlertNotificationChannels() {
  if (Platform.OS !== 'android') return
  void Notifications.setNotificationChannelAsync(ANDROID_ALERTS_CHANNEL, {
    name: 'Important alerts',
    description: 'Quotes, payments, and job updates',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#16a34a',
    sound: androidChannelSound(),
    enableVibrate: true,
    bypassDnd: false,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  })
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}

export async function ensurePushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false
  const existing = await Notifications.getPermissionsAsync()
  if (existing.status === 'granted') return true
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  })
  return requested.status === 'granted'
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

/** Map API/server channel ids to the Android channel registered in-app. */
export function resolveAndroidChannelId(channelId?: string | null): string {
  switch (channelId) {
    case 'alerts':
      return ANDROID_ALERTS_CHANNEL
    case 'messages':
      return ANDROID_MESSAGES_CHANNEL
    case 'bookings':
      return ANDROID_BOOKINGS_CHANNEL
    default:
      return ANDROID_DEFAULT_CHANNEL
  }
}
