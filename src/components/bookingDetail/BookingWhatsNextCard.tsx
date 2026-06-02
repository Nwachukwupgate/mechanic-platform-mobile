import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { CustomerWhatsNext, WhatsNextTone } from '../../utils/bookingWhatsNext'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'

const toneStyles: Record<
  WhatsNextTone,
  { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; title: string }
> = {
  action: {
    bg: colors.primary[50],
    border: colors.primary[200],
    icon: 'flash-outline',
    iconColor: colors.primary[700],
    title: colors.primary[900],
  },
  waiting: {
    bg: '#fffbeb',
    border: '#fcd34d',
    icon: 'time-outline',
    iconColor: '#b45309',
    title: '#92400e',
  },
  review: {
    bg: '#fff7ed',
    border: '#fdba74',
    icon: 'document-text-outline',
    iconColor: '#c2410c',
    title: '#9a3412',
  },
  neutral: {
    bg: colors.neutral[50],
    border: colors.neutral[200],
    icon: 'information-circle-outline',
    iconColor: colors.neutral[600],
    title: colors.text,
  },
}

type Props = {
  step: CustomerWhatsNext
}

export function BookingWhatsNextCard({ step }: Props) {
  const t = toneStyles[step.tone]
  return (
    <View style={[styles.card, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={styles.row}>
        <Ionicons name={t.icon} size={22} color={t.iconColor} style={styles.icon} />
        <View style={styles.textWrap}>
          {step.stepLabel ? <Text style={styles.stepLabel}>{step.stepLabel}</Text> : null}
          <Text style={[styles.title, { color: t.title }]}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { marginRight: 10, marginTop: 2 },
  textWrap: { flex: 1 },
  stepLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  title: { fontFamily: fonts.semiBold, fontSize: 16, marginBottom: 4 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
})
