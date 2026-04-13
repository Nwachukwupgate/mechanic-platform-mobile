import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { MechanicDashboardScreen } from '../screens/mechanic/MechanicDashboardScreen'
import { MechanicBookingsScreen } from '../screens/mechanic/MechanicBookingsScreen'
import { MechanicJobHistoryScreen } from '../screens/mechanic/MechanicJobHistoryScreen'
import { MechanicWalletScreen } from '../screens/mechanic/MechanicWalletScreen'
import { MechanicProfileScreen } from '../screens/mechanic/MechanicProfileScreen'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

const Tab = createBottomTabNavigator()

export function MechanicTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          shadowOpacity: 0,
          borderBottomWidth: 0,
          elevation: 0,
        },
        headerTitleStyle: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 12,
        },
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11 },
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
        name="History"
        component={MechanicJobHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
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
