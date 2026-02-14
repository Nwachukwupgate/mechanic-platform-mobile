import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants/storage'

export function hasCompletedOnboarding(): Promise<boolean> {
  return AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)
    .then((value) => value === 'true')
    .catch(() => false)
}

export function setOnboardingComplete(): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true')
}
