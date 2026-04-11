import React from 'react'
import { View, StyleSheet, ImageBackground, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { gradients } from '../theme/gradients'

const MAP_IMAGE_URI =
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80'

type MapBackgroundProps = {
  /** 'dark' = strong overlay for light text; 'light' = subtle for dark text */
  variant?: 'dark' | 'light'
  style?: ViewStyle
  children: React.ReactNode
}

export function MapBackground({
  variant = 'dark',
  style,
  children,
}: MapBackgroundProps) {
  const gradientColors =
    variant === 'dark'
      ? (['rgba(8, 108, 64, 0.5)', 'rgba(3, 46, 27, 0.93)'] as const)
      : gradients.mapTintTop

  return (
    <View style={[styles.container, style]}>
      <ImageBackground
        source={{ uri: MAP_IMAGE_URI }}
        style={styles.bg}
        resizeMode="cover"
        imageStyle={styles.mapImage}
      >
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.15, y: 1 }}
        />
        <View style={styles.content}>{children}</View>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    flex: 1,
    width: '100%',
  },
  mapImage: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
})
