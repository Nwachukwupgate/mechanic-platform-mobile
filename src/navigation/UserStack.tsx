import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { UserTabs } from './UserTabs'
import { BookingDetailScreen } from '../screens/user/BookingDetailScreen'
import { colors } from '../theme/colors'

const Stack = createNativeStackNavigator()

export function UserStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
      <Stack.Screen name="Main" component={UserTabs} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking' }} />
    </Stack.Navigator>
  )
}
