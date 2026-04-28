import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { DashboardScreen } from '../screens/user/DashboardScreen'
import { FindMechanicsScreen } from '../screens/user/FindMechanicsScreen'
import { BookingsScreen } from '../screens/user/BookingsScreen'
import { ProfileScreen } from '../screens/user/ProfileScreen'
import { VehiclesScreen } from '../screens/user/VehiclesScreen'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'
import { TabBarIconWithDot } from '../components/TabBarIconWithDot'

const Tab = createBottomTabNavigator()

export function UserTabs() {
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
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="home" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="FindMechanics"
        component={FindMechanicsScreen}
        options={{
          title: 'Find',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="search" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          title: 'My bookings',
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="list" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Vehicles"
        component={VehiclesScreen}
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithDot name="car" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
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
