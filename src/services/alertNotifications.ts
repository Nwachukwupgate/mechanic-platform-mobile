import * as Notifications from 'expo-notifications'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import {
  NOTIFICATION_ALERT_SOUND,
  ANDROID_ALERTS_CHANNEL,
  ANDROID_MESSAGES_CHANNEL,
} from '../constants/notificationSound'

const ALERT_SOUNDS_KEY = 'alert_sounds_enabled_v1'

export async function areAlertSoundsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ALERT_SOUNDS_KEY)
  return v !== '0'
}

export async function setAlertSoundsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ALERT_SOUNDS_KEY, enabled ? '1' : '0')
}

async function presentLocalAlert(input: {
  title: string
  body: string
  androidChannelId: string
  data?: Record<string, string>
  haptic?: Haptics.NotificationFeedbackType
}) {
  if (!(await areAlertSoundsEnabled())) return

  if (input.haptic != null) {
    void Haptics.notificationAsync(input.haptic)
  }

  if (Platform.OS === 'android') {
    // Android 8+: sound lives on the channel only — do NOT set content.sound.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      },
      trigger: {
        seconds: 1,
        channelId: input.androidChannelId,
      },
    })
    return
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: NOTIFICATION_ALERT_SOUND,
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
    androidChannelId: ANDROID_ALERTS_CHANNEL,
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
    androidChannelId: ANDROID_MESSAGES_CHANNEL,
    haptic: Haptics.NotificationFeedbackType.Warning,
  })
}
