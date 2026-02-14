import React, { useState } from 'react'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { setOnboardingComplete } from '../../utils/onboarding'
import { colors } from '../../theme/colors'
import { Button } from '../../components/Button'
import { MapBackground } from '../../components/MapBackground'

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
        <View style={styles.iconWrap}>
          <Ionicons name={slide.icon} size={72} color={colors.primary[600]} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <Button
          title={isLast ? 'Get started' : 'Next'}
          onPress={handleNext}
          variant="primary"
        />
        {!isLast && (
          <TouchableOpacity onPress={async () => { await setOnboardingComplete(); onComplete() }} style={styles.skip}>
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
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
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
  dotActive: { backgroundColor: colors.primary[600], width: 24 },
  footer: { gap: 16 },
  skip: { alignSelf: 'center' },
  skipText: { fontSize: 16, color: colors.primary[600], fontWeight: '500' },
})
