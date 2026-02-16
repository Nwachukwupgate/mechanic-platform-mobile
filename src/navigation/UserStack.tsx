import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { UserTabs } from './UserTabs'
import { BookingDetailScreen } from '../screens/user/BookingDetailScreen'
import { VehicleFormScreen } from '../screens/user/VehicleFormScreen'
import { JobHistoryScreen } from '../screens/user/JobHistoryScreen'
import { UserWalletScreen } from '../screens/user/UserWalletScreen'
import { colors } from '../theme/colors'

const Stack = createNativeStackNavigator()

export function UserStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
      <Stack.Screen name="Main" component={UserTabs} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking' }} />
      <Stack.Screen name="VehicleForm" component={VehicleFormScreen} options={({ route }: any) => ({ title: route.params?.vehicleId ? 'Edit vehicle' : 'Add vehicle' })} />
      <Stack.Screen name="JobHistory" component={JobHistoryScreen} options={{ title: 'Job history' }} />
      <Stack.Screen name="UserWallet" component={UserWalletScreen} options={{ title: 'Wallet' }} />
    </Stack.Navigator>
  )
}
