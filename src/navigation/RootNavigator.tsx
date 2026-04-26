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
import { hasCompletedOnboarding } from '../utils/onboarding'
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen'
import { AuthStack } from './AuthStack'
import { UserStack } from './UserStack'
import { MechanicStack } from './MechanicStack'

SplashScreen.preventAutoHideAsync()

export function RootNavigator() {
  const [fontsLoaded] = useFonts({
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

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    hasCompletedOnboarding().then(setOnboardingDone)
  }, [hydrated])

  useEffect(() => {
    if (!hydrated || onboardingDone === null || !fontsLoaded) return
    SplashScreen.hideAsync()
  }, [hydrated, onboardingDone, fontsLoaded])

  if (!hydrated || onboardingDone === null || !fontsLoaded) {
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
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    )
  }

  if (user.role === 'USER') {
    return (
      <NavigationContainer>
        <UserStack />
      </NavigationContainer>
    )
  }

  return (
    <NavigationContainer>
      <MechanicStack />
    </NavigationContainer>
  )
}
