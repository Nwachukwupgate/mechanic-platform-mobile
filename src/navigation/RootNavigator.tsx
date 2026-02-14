import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '../store/authStore'
import { hasCompletedOnboarding } from '../utils/onboarding'
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen'
import { AuthStack } from './AuthStack'
import { UserStack } from './UserStack'
import { MechanicStack } from './MechanicStack'

SplashScreen.preventAutoHideAsync()

export function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const hydrate = useAuthStore((s) => s.hydrate)

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    hasCompletedOnboarding().then(setOnboardingDone)
  }, [hydrated])

  useEffect(() => {
    if (!hydrated || onboardingDone === null) return
    SplashScreen.hideAsync()
  }, [hydrated, onboardingDone])

  if (!hydrated || onboardingDone === null) {
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
