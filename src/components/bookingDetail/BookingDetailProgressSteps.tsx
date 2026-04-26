import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'

const STEPS = ['Requested', 'Accepted', 'In progress', 'Done', 'Paid'] as const
const STATUS_ORDER = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'PAID'] as const

function statusToIndex(status: string): number {
  if (status === 'DELIVERED') return 4
  if (status === 'EXPIRED') return -1
  const i = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number])
  return i === -1 ? 0 : i
}

function progressLabel(status: string, role: 'user' | 'mechanic'): string {
  if (status === 'EXPIRED') return role === 'user' ? 'Job expired' : 'Request expired'
  const idx = statusToIndex(status)
  if (idx >= 4) return role === 'user' ? 'Job progress: complete' : 'Job pipeline: complete'
  const next = STEPS[idx + 1] ?? STEPS[idx]
  return role === 'user' ? `Job progress, next: ${next}` : `Job pipeline, next: ${next}`
}

type Props = {
  status: string
  role: 'user' | 'mechanic'
}

export function BookingDetailProgressSteps({ status, role }: Props) {
  const activeIndex = statusToIndex(status)
  const expired = status === 'EXPIRED'

  const lineLeft = (i: number) => {
    if (i === 0) return 'transparent' as const
    return !expired && activeIndex >= i ? colors.primary[600] : colors.neutral[200]
  }
  const lineRight = (i: number) => {
    if (i === STEPS.length - 1) return 'transparent' as const
    return !expired && activeIndex > i ? colors.primary[600] : colors.neutral[200]
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.secLbl}>{progressLabel(status, role)}</Text>
      <View style={styles.stepsRow}>
        {STEPS.map((label, i) => {
          const done = !expired && i <= activeIndex
          return (
            <View key={label} style={styles.stepCol}>
              <View style={styles.dotRow}>
                <View style={[styles.seg, { backgroundColor: lineLeft(i) }]} />
                <View style={[styles.dot, done && styles.dotDone, expired && styles.dotMuted]}>
                  {done && !expired ? (
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  ) : (
                    <View style={[styles.dotInner, done && styles.dotInnerHidden]} />
                  )}
                </View>
                <View style={[styles.seg, { backgroundColor: lineRight(i) }]} />
              </View>
              <Text style={[styles.stepLbl, done && styles.stepLblDone, expired && styles.stepLblMuted]}>
                {label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    backgroundColor: colors.surface,
  },
  secLbl: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.primary[600],
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  seg: {
    flex: 1,
    height: 2,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary[600] },
  dotMuted: { backgroundColor: colors.neutral[300] },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[400],
  },
  dotInnerHidden: { opacity: 0 },
  stepLbl: {
    fontSize: 8.5,
    fontFamily: fonts.semiBold,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 12,
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
  stepLblDone: { color: colors.primary[600] },
  stepLblMuted: { color: colors.neutral[400] },
})
