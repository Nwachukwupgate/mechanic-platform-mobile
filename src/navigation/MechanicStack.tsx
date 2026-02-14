import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MechanicTabs } from './MechanicTabs'
import { MechanicBookingDetailScreen } from '../screens/mechanic/MechanicBookingDetailScreen'
import { colors } from '../theme/colors'

const Stack = createNativeStackNavigator()

export function MechanicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
      <Stack.Screen name="Main" component={MechanicTabs} options={{ headerShown: false }} />
      <Stack.Screen name="MechanicBookingDetail" component={MechanicBookingDetailScreen} options={{ title: 'Booking' }} />
    </Stack.Navigator>
  )
}
