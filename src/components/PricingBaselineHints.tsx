import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

export type PricingBaseline = {
  partsNaira: number
  labourNaira: number
  otherFeesNaira: number
  totalNaira: number
  label: string
}

type Props = {
  baseline: PricingBaseline | null | undefined
  compact?: boolean
}

export function PricingBaselineBanner({ baseline, compact }: Props) {
  if (!baseline) return null
  return (
    <View style={[styles.banner, compact && styles.bannerCompact]}>
      <Text style={styles.label}>{baseline.label}</Text>
      <Text style={styles.total}>Total was ₦{Number(baseline.totalNaira).toLocaleString()}</Text>
      <Text style={styles.hint}>Previous: parts ₦{Number(baseline.partsNaira).toLocaleString()}, labour ₦{Number(baseline.labourNaira).toLocaleString()}, other ₦{Number(baseline.otherFeesNaira).toLocaleString()}</Text>
    </View>
  )
}

export function fieldPlaceholder(
  field: 'parts' | 'labour' | 'other',
  baseline: PricingBaseline | null | undefined,
): string {
  if (!baseline) return '0'
  const map = {
    parts: baseline.partsNaira,
    labour: baseline.labourNaira,
    other: baseline.otherFeesNaira,
  }
  return `Was ₦${Number(map[field]).toLocaleString()}`
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[400],
  },
  bannerCompact: { marginBottom: 8, padding: 10 },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  total: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral[500], marginTop: 6 },
})
