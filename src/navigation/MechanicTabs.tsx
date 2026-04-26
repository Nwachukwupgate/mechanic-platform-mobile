import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MechanicDashboardScreen } from '../screens/mechanic/MechanicDashboardScreen'
import { MechanicBookingsScreen } from '../screens/mechanic/MechanicBookingsScreen'
import { MechanicJobHistoryScreen } from '../screens/mechanic/MechanicJobHistoryScreen'
import { MechanicWalletScreen } from '../screens/mechanic/MechanicWalletScreen'
import { MechanicProfileScreen } from '../screens/mechanic/MechanicProfileScreen'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'
import { TabBarIconWithDot } from '../components/TabBarIconWithDot'

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
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 66,
          paddingTop: 4,
          paddingBottom: 6,
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
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="home" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={MechanicBookingsScreen}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="briefcase" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={MechanicJobHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="time" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={MechanicWalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="wallet" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MechanicProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="person" size={size} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
