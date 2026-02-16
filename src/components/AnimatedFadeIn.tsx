import React, { useEffect, useRef } from 'react'
import { Animated, ViewStyle } from 'react-native'

type Props = {
  children: React.ReactNode
  delay?: number
  duration?: number
  style?: ViewStyle
}

export function AnimatedFadeIn({ children, delay = 0, duration = 320, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start()
  }, [opacity, duration, delay])

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  )
}
