import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit'
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import { useAuthStore } from '../store/authStore'
import { useSyncExpoPushToken } from '../hooks/useSyncExpoPushToken'
import { usePushNotificationNavigation } from '../hooks/usePushNotificationNavigation'
import { navigationRef } from './navigationRef'
import { hasCompletedOnboarding } from '../utils/onboarding'
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen'
import { AuthStack } from './AuthStack'
import { UserStack } from './UserStack'
import { MechanicStack } from './MechanicStack'

SplashScreen.preventAutoHideAsync()

export function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  })
  const hydrated = useAuthStore((s) => s.hydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const hydrate = useAuthStore((s) => s.hydrate)

  useSyncExpoPushToken(user, isAuthenticated)
  usePushNotificationNavigation(isAuthenticated)

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const fontsReady = fontsLoaded || fontError != null
  const appReady = hydrated && onboardingDone !== null && fontsReady

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    hasCompletedOnboarding()
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(false))
  }, [hydrated])

  useEffect(() => {
    if (!appReady) return
    SplashScreen.hideAsync().catch(() => {})
  }, [appReady])

  /** Never leave the native splash up indefinitely if fonts or storage hang. */
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {})
    }, 10_000)
    return () => clearTimeout(t)
  }, [])

  if (!appReady) {
    return null
  }

  if (!onboardingDone) {
    return (
      <OnboardingScreen
        onComplete={() => setOnboardingDone(true)}
      />
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <NavigationContainer ref={navigationRef}>
        <AuthStack />
      </NavigationContainer>
    )
  }

  if (user.role === 'USER') {
    return (
      <NavigationContainer ref={navigationRef}>
        <UserStack />
      </NavigationContainer>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <MechanicStack />
    </NavigationContainer>
  )
}
