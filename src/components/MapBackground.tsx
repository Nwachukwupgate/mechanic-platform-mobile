import React from 'react'
import { View, StyleSheet, ImageBackground, ViewStyle } from 'react-native'

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
  const overlayColor =
    variant === 'dark'
      ? 'rgba(3, 46, 27, 0.88)'
      : 'rgba(248, 250, 252, 0.92)'

  return (
    <View style={[styles.container, style]}>
      <ImageBackground
        source={{ uri: MAP_IMAGE_URI }}
        style={styles.bg}
        resizeMode="cover"
        imageStyle={styles.mapImage}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
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
    opacity: 0.35,
  },
  content: {
    flex: 1,
  },
})
