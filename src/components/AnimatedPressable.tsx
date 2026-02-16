import React, { useRef } from 'react'
import { Animated, Pressable, ViewStyle } from 'react-native'

type Props = {
  children: React.ReactNode
  onPress: () => void
  style?: ViewStyle
  disabled?: boolean
}

export function AnimatedPressable({ children, onPress, style, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current

  const animateIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start()
  }
  const animateOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start()
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  )
}
