import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'

type Props = {
  name: React.ComponentProps<typeof Ionicons>['name']
  color: string
  size: number
  focused: boolean
}

export function TabBarIconWithDot({ name, color, size, focused }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={name} size={size} color={color} />
      <View style={styles.dotRow}>
        {focused ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  dotRow: { height: 8, marginTop: 2, justifyContent: 'flex-start', alignItems: 'center' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  dotPlaceholder: { width: 5, height: 5 },
})
