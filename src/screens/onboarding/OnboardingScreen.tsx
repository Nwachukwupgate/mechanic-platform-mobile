import React, { useState } from 'react'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { setOnboardingComplete } from '../../utils/onboarding'
import { colors } from '../../theme/colors'
import { gradients } from '../../theme/gradients'
import { typography } from '../../theme/typography'
import { fonts } from '../../theme/fonts'
import { Button } from '../../components/Button'
import { MapBackground } from '../../components/MapBackground'
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    icon: 'car-sport' as const,
    title: 'Find trusted mechanics',
    subtitle: 'See verified mechanics near you and choose the right one for your vehicle.',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'Book & chat in one place',
    subtitle: 'Request a service, chat with your mechanic, and track the job in real time.',
  },
  {
    icon: 'construct' as const,
    title: 'Get back on the road',
    subtitle: 'Quality repairs, fair pricing, and ratings from real customers.',
  },
]

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  const handleNext = async () => {
    if (isLast) {
      await setOnboardingComplete()
      onComplete()
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <MapBackground variant="light" style={styles.container}>
      <View style={styles.content}>
        <AnimatedFadeIn key={index} duration={400}>
          <LinearGradient
            colors={[...gradients.onboardingOrb]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <View style={styles.iconInner}>
              <Ionicons name={slide.icon} size={72} color={colors.primary[600]} />
            </View>
          </LinearGradient>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </AnimatedFadeIn>
      </View>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Button title={isLast ? 'Get started' : 'Next'} onPress={handleNext} variant="primary" />
        {!isLast && (
          <TouchableOpacity
            onPress={async () => {
              await setOnboardingComplete()
              onComplete()
            }}
            style={styles.skip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </MapBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: width * 0.38,
    maxWidth: 160,
    height: width * 0.38,
    maxHeight: 160,
    borderRadius: 999,
    padding: 4,
    marginBottom: 32,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconInner: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  title: {
    ...typography.title,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300],
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary[600],
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  footer: { gap: 16 },
  skip: { alignSelf: 'center', paddingVertical: 8 },
  skipText: { ...typography.body, color: colors.primary[600], fontFamily: fonts.semiBold },
})
