import React from 'react'
import { View, StyleSheet } from 'react-native'

/** Decorative ring orbs behind forest hero (booking_detail_v2.html). */
export function BookingHeroDecor() {
  return (
    <>
      <View style={styles.ringLarge} pointerEvents="none" />
      <View style={styles.ringSmall} pointerEvents="none" />
    </>
  )
}

const RING = 'rgba(74, 222, 128, 0.06)'
const RING_SOFT = 'rgba(74, 222, 128, 0.04)'

const styles = StyleSheet.create({
  ringLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 40,
    borderColor: RING,
    top: -80,
    right: -50,
  },
  ringSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 25,
    borderColor: RING_SOFT,
    bottom: -40,
    left: 20,
  },
})
