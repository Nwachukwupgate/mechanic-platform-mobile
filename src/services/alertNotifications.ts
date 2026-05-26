import * as Notifications from 'expo-notifications'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { GARAGE_PING_SOUND } from '../constants/notificationSound'

const ALERT_SOUNDS_KEY = 'alert_sounds_enabled_v1'

export async function areAlertSoundsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ALERT_SOUNDS_KEY)
  return v !== '0'
}

export async function setAlertSoundsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ALERT_SOUNDS_KEY, enabled ? '1' : '0')
}

/** High-priority channel for quotes, payments, job updates (Android). */
export function configureAlertNotificationChannels() {
  if (Platform.OS !== 'android') return
  void Notifications.setNotificationChannelAsync('alerts', {
    name: 'Important alerts',
    description: 'Quotes, payments, and job updates',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#16a34a',
    sound: GARAGE_PING_SOUND,
    enableVibrate: true,
    bypassDnd: false,
  })
}

async function presentLocalAlert(input: {
  title: string
  body: string
  channelId: 'alerts' | 'messages'
  data?: Record<string, string>
  haptic?: Haptics.NotificationFeedbackType
}) {
  if (!(await areAlertSoundsEnabled())) return

  if (input.haptic != null) {
    void Haptics.notificationAsync(input.haptic)
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: GARAGE_PING_SOUND,
      ...(Platform.OS === 'android' ? { channelId: input.channelId } : {}),
    },
    trigger: null,
  })
}

/** Major job events — quote accepted, payment received, etc. */
export async function presentMajorAlert(input: {
  title: string
  body: string
  data?: Record<string, string>
}) {
  return presentLocalAlert({
    ...input,
    channelId: 'alerts',
    haptic: Haptics.NotificationFeedbackType.Success,
  })
}

/** Chat messages — still audible, slightly lighter haptic. */
export async function presentMessageAlert(input: {
  title: string
  body: string
  data?: Record<string, string>
}) {
  return presentLocalAlert({
    ...input,
    channelId: 'messages',
    haptic: Haptics.NotificationFeedbackType.Warning,
  })
}
