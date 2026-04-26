import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

const STEPS = ['Requested', 'Accepted', 'In progress', 'Done', 'Paid'] as const

function stepIndex(status: string): number {
  switch (status) {
    case 'REQUESTED':
      return 0
    case 'ACCEPTED':
      return 1
    case 'IN_PROGRESS':
      return 2
    case 'DONE':
      return 3
    case 'PAID':
    case 'DELIVERED':
      return 4
    default:
      return -1
  }
}

export function BookingProgressBar({ status }: { status?: string }) {
  if (!status || status === 'EXPIRED') return null
  const active = stepIndex(status)
  if (active < 0) return null
  const pct = active <= 0 ? 6 : (active / (STEPS.length - 1)) * 100

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <Text style={styles.caption}>Job progress</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.labels}>
        {STEPS.map((label, i) => (
          <Text
            key={label}
            style={[styles.label, i <= active && styles.labelActive]}
            numberOfLines={2}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  caption: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  label: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 9,
    lineHeight: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
})
