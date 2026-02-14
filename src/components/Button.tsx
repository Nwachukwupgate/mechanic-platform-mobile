import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { colors } from '../theme/colors'

type Props = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, textStyle }: Props) {
  const isDisabled = disabled || loading
  const variantStyles = {
    primary: { bg: colors.primary[600], text: '#fff' },
    secondary: { bg: colors.neutral[200], text: colors.text },
    outline: { bg: 'transparent', text: colors.primary[600], borderWidth: 2, borderColor: colors.primary[600] },
  }
  const v = variantStyles[variant]
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: v.bg, opacity: isDisabled ? 0.7 : 1, borderWidth: (v as { borderWidth?: number }).borderWidth ?? 0, borderColor: (v as { borderColor?: string }).borderColor },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: v.text }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
})
