import React from 'react'
import { View, StyleSheet } from 'react-native'

/** Soft ring accents behind dashboard hero content (see mechanic_app_homepage_redesign.html). */
export function HeroDecorativeRings() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.ringLarge} />
      <View style={styles.ringSmall} />
    </View>
  )
}

const RING = 'rgba(74, 222, 128, 0.07)'
const RING_SOFT = 'rgba(74, 222, 128, 0.05)'

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ringLarge: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 40,
    borderColor: RING,
    backgroundColor: 'transparent',
    top: -60,
    right: -50,
  },
  ringSmall: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 28,
    borderColor: RING_SOFT,
    backgroundColor: 'transparent',
    bottom: 8,
    left: 16,
  },
})
