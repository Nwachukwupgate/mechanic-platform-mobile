import React from 'react'
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { colors } from '../theme/colors'

export function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator size="large" color={colors.primary[600]} style={styles.spinner} />
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logo: { width: 64, height: 64, marginBottom: 16 },
  spinner: { marginTop: 0 },
})
