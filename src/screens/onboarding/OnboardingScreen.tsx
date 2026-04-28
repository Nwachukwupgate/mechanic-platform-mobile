import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { setStatusBarStyle } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { setOnboardingComplete } from '../../utils/onboarding'
import { fonts } from '../../theme/fonts'

const SLIDE1_BG = '#0c2e1a'
const SLIDE2_BG = '#061d10'
const SLIDE3_BG = '#0a1f12'
const BOTTOM_FADE_1 = '#061810'
const BOTTOM_FADE_2 = '#061d10'
const BOTTOM_FADE_3 = '#0a1f12'
const GREEN = '#4ade80'
const GREEN_SOFT = 'rgba(74, 222, 128, 0.12)'
const GREEN_BORDER = 'rgba(74, 222, 128, 0.25)'
const RING_1 = 'rgba(74, 222, 128, 0.12)'
const RING_3 = 'rgba(74, 222, 128, 0.06)'
const ILLUS_RATIO = 0.58

function DotTexture({
  width,
  height,
  spacing,
  dotR,
  opacity,
}: {
  width: number
  height: number
  spacing: number
  dotR: number
  opacity: number
}) {
  const cols = Math.min(14, Math.ceil(width / spacing))
  const rows = Math.min(18, Math.ceil(height / spacing))
  const total = cols * rows
  const dots = []
  for (let i = 0; i < total; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    dots.push(
      <View
        key={`d-${i}`}
        style={{
          position: 'absolute',
          left: col * spacing + spacing * 0.5 - dotR,
          top: row * spacing + spacing * 0.5 - dotR,
          width: dotR * 2,
          height: dotR * 2,
          borderRadius: dotR,
          backgroundColor: GREEN,
        }}
      />
    )
  }
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {dots}
    </View>
  )
}

function ConcentricRings({ size = 360 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      pointerEvents="none"
    >
      <View
        style={[
          styles.ringBase,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: RING_3,
          },
        ]}
      />
      <View
        style={[
          styles.ringBase,
          {
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: 140,
            borderColor: RING_1,
          },
        ]}
      />
      <View
        style={[
          styles.ringBase,
          {
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            borderColor: RING_1,
          },
        ]}
      />
    </View>
  )
}

type IonName = React.ComponentProps<typeof Ionicons>['name']

function IconCircle({ name }: { name: IonName }) {
  return (
    <View style={styles.iconCircleOuter}>
      <View style={styles.iconCircleInner}>
        <Ionicons name={name} size={56} color="#16a34a" />
      </View>
    </View>
  )
}

function RoadFade({ bottomColor }: { bottomColor: string }) {
  return (
    <LinearGradient
      colors={['transparent', bottomColor]}
      locations={[0, 0.45]}
      style={styles.roadFade}
      pointerEvents="none"
    />
  )
}

function SlideDecorArcs() {
  return (
    <View style={styles.arcLayer} pointerEvents="none">
      <View style={[styles.arcStroke, { borderTopLeftRadius: 400, borderTopRightRadius: 400, opacity: 0.12 }]} />
    </View>
  )
}

function Slide3RoadLines() {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.18 }]} pointerEvents="none">
      <View style={[styles.roadLine, { left: '48%', marginLeft: -0.5, transform: [{ rotate: '17deg' }] }]} />
      <View style={[styles.roadLine, { left: '52%', marginLeft: -0.5, transform: [{ rotate: '-17deg' }] }]} />
      <View style={[styles.roadLine, { left: '42%', transform: [{ rotate: '24deg' }], opacity: 0.6 }]} />
      <View style={[styles.roadLine, { left: '58%', transform: [{ rotate: '-24deg' }], opacity: 0.6 }]} />
      <View style={[styles.horizonLine, { top: 150, left: 50, right: 50, opacity: 0.45 }]} />
      <View style={[styles.horizonLine, { top: 230, left: 20, right: 20, opacity: 0.35 }]} />
    </View>
  )
}

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const illusH = height * ILLUS_RATIO

  useEffect(() => {
    setStatusBarStyle('light')
    return () => setStatusBarStyle('dark')
  }, [])

  const finish = useCallback(async () => {
    await setOnboardingComplete()
    onComplete()
  }, [onComplete])

  const goToSlide = useCallback(
    (i: number) => {
      scrollRef.current?.scrollTo({ x: i * width, animated: true })
      setIndex(i)
    },
    [width]
  )

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x
      setIndex(Math.min(2, Math.max(0, Math.round(x / width))))
    },
    [width]
  )

  const next = useCallback(() => {
    if (index < 2) goToSlide(index + 1)
    else void finish()
  }, [index, goToSlide, finish])

  const skipIntro = useCallback(() => goToSlide(2), [goToSlide])

  const padBottom = Math.max(insets.bottom, 20)
  const edgeH = { paddingLeft: insets.left, paddingRight: insets.right }

  return (
    <View style={[styles.root, { backgroundColor: '#1a1a1a' }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        {/* Slide 1 */}
        <View style={{ width, height, backgroundColor: SLIDE1_BG }}>
          <DotTexture width={width} height={illusH} spacing={28} dotR={1.5} opacity={0.15} />
          <SlideDecorArcs />
          <View style={[styles.illusArea, { height: illusH }]}>
            <View style={styles.illusRingsLayer} pointerEvents="none">
              <ConcentricRings />
            </View>
            <IconCircle name="car-sport" />

            <View style={[styles.badge, styles.badgeTopRight]}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>Verified mechanic</Text>
            </View>
            <View style={[styles.badge, styles.badgeTopLeft]}>
              <Ionicons name="location" size={12} color={GREEN} style={{ marginRight: 2 }} />
              <Text style={styles.badgeText}>0.8 km away</Text>
            </View>

            <View style={[styles.statChip, { top: illusH * 0.42, right: 18 }]}>
              <Text style={styles.statNum}>4.9★</Text>
              <Text style={styles.statLbl}>Avg rating</Text>
            </View>
            <View style={[styles.statChip, { top: illusH * 0.42, left: 18 }]}>
              <Text style={styles.statNum}>1.2k+</Text>
              <Text style={styles.statLbl}>Mechanics</Text>
            </View>
          </View>
          <RoadFade bottomColor={BOTTOM_FADE_1} />

          <View style={[styles.bottomCard, { paddingBottom: padBottom }]}>
            <LinearGradient
              colors={['transparent', BOTTOM_FADE_1]}
              locations={[0, 0.35]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <View style={[styles.bottomCardInner, edgeH]}>
            <View style={styles.slideTag}>
              <Text style={styles.slideTagText}>01 / 03</Text>
            </View>
            <Text style={styles.slideTitle}>
              Find <Text style={styles.titleEm}>trusted</Text>
              {'\n'}mechanics nearby
            </Text>
            <Text style={styles.slideSub}>
              See verified mechanics near you and choose the right one for your vehicle instantly.
            </Text>
            <Dots index={index} />
            <CtaButton label="Next" onPress={next} />
            <Pressable onPress={skipIntro} style={styles.skipHit}>
              <Text style={styles.skipText}>Skip intro</Text>
            </Pressable>
            </View>
          </View>
        </View>

        {/* Slide 2 */}
        <View style={{ width, height, backgroundColor: SLIDE2_BG }}>
          <DotTexture width={width} height={illusH} spacing={24} dotR={1.2} opacity={0.1} />
          <View style={[styles.illusArea, { height: illusH }]}>
            <View style={styles.illusRingsLayer} pointerEvents="none">
              <ConcentricRings size={320} />
            </View>
            <IconCircle name="chatbubbles" />

            <View style={[styles.chatBubble, styles.chatBubbleMech, { top: 68, left: 18 }]}>
              <Text style={styles.chatLabelMech}>Your Mechanic</Text>
              <Text style={styles.chatBodyMech}>Your car is ready! Comes to ₦18,500 🔧</Text>
            </View>
            <View style={[styles.chatBubble, styles.chatBubbleUser, { top: 155, right: 14 }]}>
              <Text style={styles.chatLabelUser}>You</Text>
              <Text style={styles.chatBodyUser}>Great, paying now 👍</Text>
            </View>

            <View style={styles.statChipWideWrap}>
              <View style={styles.statChipWide}>
                <Text style={styles.statNumWide}>Real-time tracking</Text>
              </View>
            </View>
          </View>
          <RoadFade bottomColor={BOTTOM_FADE_2} />

          <View style={[styles.bottomCard, { paddingBottom: padBottom }]}>
            <LinearGradient
              colors={['transparent', BOTTOM_FADE_2]}
              locations={[0, 0.35]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <View style={[styles.bottomCardInner, edgeH]}>
            <View style={styles.slideTag}>
              <Text style={styles.slideTagText}>02 / 03</Text>
            </View>
            <Text style={styles.slideTitle}>
              Book & <Text style={styles.titleEm}>chat</Text>
              {'\n'}in one place
            </Text>
            <Text style={styles.slideSub}>
              Request a service, chat with your mechanic, track the job and pay, all without leaving the app.
            </Text>
            <Dots index={index} />
            <CtaButton label="Next" onPress={next} />
            <Pressable onPress={skipIntro} style={styles.skipHit}>
              <Text style={styles.skipText}>Skip intro</Text>
            </Pressable>
            </View>
          </View>
        </View>

        {/* Slide 3 */}
        <View style={{ width, height, backgroundColor: SLIDE3_BG }}>
          <DotTexture width={width} height={illusH} spacing={30} dotR={1.5} opacity={0.08} />
          <Slide3RoadLines />
          <View style={[styles.illusArea, { height: illusH }]}>
            <View style={styles.illusRingsLayer} pointerEvents="none">
              <ConcentricRings />
            </View>
            <IconCircle name="walk" />

            <View style={[styles.pillCol, { top: 75, right: 16 }]}>
              <View style={styles.pillRow}>
                <Ionicons name="shield-checkmark" size={14} color={GREEN} />
                <Text style={styles.pillTxt}>Verified pros</Text>
              </View>
              <View style={styles.pillRow}>
                <Ionicons name="cash" size={14} color={GREEN} />
                <Text style={styles.pillTxt}>Fair pricing</Text>
              </View>
            </View>

            <View style={[styles.pillGlass, { top: 90, left: 16 }]}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={styles.pillTxt}>Real reviews</Text>
            </View>
          </View>
          <RoadFade bottomColor={BOTTOM_FADE_3} />

          <View style={[styles.bottomCard, { paddingBottom: padBottom }]}>
            <LinearGradient
              colors={['transparent', BOTTOM_FADE_3]}
              locations={[0, 0.35]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <View style={[styles.bottomCardInner, edgeH]}>
            <View style={styles.slideTag}>
              <Text style={styles.slideTagText}>03 / 03</Text>
            </View>
            <Text style={styles.slideTitle}>
              Get back{'\n'}on the <Text style={styles.titleEm}>road</Text>
            </Text>
            <Text style={styles.slideSub}>
              Quality repairs, fair pricing, and ratings from real customers so you can book with confidence.
            </Text>
            <Dots index={index} />
            <CtaButton label="Get started for free" onPress={finish} />
            <Pressable onPress={finish} style={styles.skipHit}>
              <Text style={styles.skipAlt}>Already have an account? Log in</Text>
            </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function Dots({ index }: { index: number }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      ))}
    </View>
  )
}

function CtaButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.92, transform: [{ scale: 0.98 }] } : undefined)}
    >
      <LinearGradient colors={['#16a34a', '#22c55e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaBtn}>
        <Text style={styles.ctaText}>{label}</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
  scroll: { flex: 1, width: '100%' },
  illusArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  illusRingsLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCardInner: {
    zIndex: 1,
    position: 'relative',
    width: '100%',
  },
  ringBase: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  iconCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 8,
    borderWidth: 8,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  iconCircleInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: 'rgba(22, 163, 74, 0.08)',
  },
  roadFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  arcLayer: {
    ...StyleSheet.absoluteFillObject,
    height: '58%',
    opacity: 0.15,
    alignItems: 'center',
    overflow: 'hidden',
  },
  arcStroke: {
    position: 'absolute',
    bottom: -120,
    width: '140%',
    height: 280,
    borderWidth: 1,
    borderColor: GREEN,
  },
  roadLine: {
    position: 'absolute',
    top: -40,
    width: 1,
    height: 480,
    backgroundColor: GREEN,
  },
  horizonLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: GREEN,
  },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  badgeTopRight: { top: 80, right: 20 },
  badgeTopLeft: { top: 130, left: 14 },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: fonts.semiBold },
  statChip: {
    position: 'absolute',
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    zIndex: 20,
    alignItems: 'center',
  },
  statChipWideWrap: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  statChipWide: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statNum: {
    color: GREEN,
    fontSize: 16,
    fontFamily: fonts.headingBold,
    lineHeight: 18,
  },
  statNumWide: {
    color: GREEN,
    fontSize: 13,
    fontFamily: fonts.headingBold,
  },
  statLbl: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
    fontFamily: fonts.semiBold,
  },
  chatBubble: {
    position: 'absolute',
    maxWidth: 180,
    zIndex: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chatBubbleMech: {
    backgroundColor: 'rgba(22, 163, 74, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    borderBottomLeftRadius: 4,
  },
  chatBubbleUser: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomRightRadius: 4,
    maxWidth: 165,
  },
  chatLabelMech: { fontSize: 11, color: GREEN, fontFamily: fonts.semiBold, marginBottom: 3 },
  chatBodyMech: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 17, fontFamily: fonts.regular },
  chatLabelUser: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: fonts.semiBold, marginBottom: 3 },
  chatBodyUser: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17, fontFamily: fonts.regular },
  pillCol: { position: 'absolute', gap: 8, zIndex: 20 },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillGlass: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  pillTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: fonts.semiBold },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 28,
    backgroundColor: 'transparent',
    minHeight: 280,
  },
  slideTag: {
    alignSelf: 'center',
    backgroundColor: GREEN_SOFT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  slideTagText: { color: GREEN, fontSize: 11, fontFamily: fonts.semiBold, letterSpacing: 0.5 },
  slideTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  titleEm: { color: GREEN, fontStyle: 'normal' },
  slideSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 24,
    fontFamily: fonts.regular,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 24, backgroundColor: GREEN },
  ctaBtn: {
    alignSelf: 'stretch',
    width: '100%',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.3,
  },
  skipHit: { marginTop: 14, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: fonts.semiBold, letterSpacing: 0.3 },
  skipAlt: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: fonts.semiBold, textAlign: 'center' },
})
