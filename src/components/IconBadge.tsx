import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'

type Props = {
  name: React.ComponentProps<typeof Ionicons>['name']
  size?: number
  color?: string
  backgroundColor?: string
  style?: ViewStyle
}

export function IconBadge({
  name,
  size = 24,
  color = colors.primary[600],
  backgroundColor = colors.primary[100],
  style,
}: Props) {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
