import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MechanicTabs } from './MechanicTabs'
import { MechanicBookingDetailScreen } from '../screens/mechanic/MechanicBookingDetailScreen'
import { MechanicJobHistoryScreen } from '../screens/mechanic/MechanicJobHistoryScreen'
import { MechanicTransactionDetailScreen } from '../screens/mechanic/MechanicTransactionDetailScreen'
import { NotificationsScreen } from '../screens/shared/NotificationsScreen'
import { colors } from '../theme/colors'
import { forestHeaderScreenOptions } from './forestHeaderScreenOptions'

const Stack = createNativeStackNavigator()

export function MechanicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
      <Stack.Screen name="Main" component={MechanicTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="MechanicBookingDetail"
        component={MechanicBookingDetailScreen}
        options={{ title: 'Booking', ...forestHeaderScreenOptions }}
      />
      <Stack.Screen
        name="MechanicJobHistory"
        component={MechanicJobHistoryScreen}
        options={{ title: 'Job history', ...forestHeaderScreenOptions }}
      />
      <Stack.Screen
        name="MechanicTransactionDetail"
        component={MechanicTransactionDetailScreen}
        options={{ title: 'Transaction' }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Activity' }} />
    </Stack.Navigator>
  )
}
