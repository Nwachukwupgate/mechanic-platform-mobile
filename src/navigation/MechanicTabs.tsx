import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { MechanicDashboardScreen } from '../screens/mechanic/MechanicDashboardScreen'
import { MechanicBookingsScreen } from '../screens/mechanic/MechanicBookingsScreen'
import { MechanicWalletScreen } from '../screens/mechanic/MechanicWalletScreen'
import { MechanicProfileScreen } from '../screens/mechanic/MechanicProfileScreen'
import { colors } from '../theme/colors'

const Tab = createBottomTabNavigator()

export function MechanicTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[500],
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={MechanicDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={MechanicBookingsScreen}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={MechanicWalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MechanicProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
