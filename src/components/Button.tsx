import React from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme/colors'
import { gradients } from '../theme/gradients'
import { fonts } from '../theme/fonts'

type Props = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  disabled?: boolean
  /** Primary: size button to label + padding instead of stretching (e.g. role toggles in a row). */
  hugContent?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  hugContent,
  style,
  textStyle,
}: Props) {
  const isDisabled = disabled || loading
  if (variant === 'primary') {
    const fill = !hugContent
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.primaryWrap,
          hugContent && styles.primaryWrapHug,
          { opacity: isDisabled ? 0.65 : pressed ? 0.92 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={[...gradients.primaryButton]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.primaryGradient, fill && styles.primaryGradientFill]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.primaryText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </Pressable>
    )
  }

  const variantStyles = {
    secondary: { bg: colors.neutral[100], text: colors.text, borderWidth: 0 as number },
    outline: {
      bg: 'transparent',
      text: colors.primary[600],
      borderWidth: 2,
      borderColor: colors.primary[600],
    },
  }
  const v = variantStyles[variant]
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.btn,
        {
          backgroundColor: v.bg,
          opacity: isDisabled ? 0.65 : 1,
          borderWidth: v.borderWidth,
          borderColor: 'borderColor' in v ? v.borderColor : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.altText, { color: v.text }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  primaryWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryWrapHug: {
    alignSelf: 'flex-start',
  },
  primaryGradient: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  primaryGradientFill: {
    width: '100%',
  },
  primaryText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
})
