import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'

type Props = {
  status: string | undefined
  rejectionReason?: string | null
  balanceDueNaira?: number | null
}

export function MechanicCostStatusBanner({ status, rejectionReason, balanceDueNaira }: Props) {
  if (rejectionReason) {
    return (
      <View style={[styles.banner, styles.bannerDanger]}>
        <Ionicons name="alert-circle" size={22} color="#b91c1c" style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, styles.titleDanger]}>Customer declined your quote</Text>
          <Text style={[styles.body, styles.bodyDanger]}>{rejectionReason}</Text>
          <Text style={styles.sub}>Adjust the breakdown below and send again.</Text>
        </View>
      </View>
    )
  }

  if (status === 'SUBMITTED') {
    return (
      <View style={[styles.banner, styles.bannerWarn]}>
        <Ionicons name="time-outline" size={22} color="#b45309" style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, styles.titleWarn]}>Customer has not accepted this price yet</Text>
          <Text style={[styles.body, styles.bodyWarn]}>
            Your breakdown was sent for approval. They can accept or decline in their app. You cannot edit until
            they respond.
          </Text>
        </View>
      </View>
    )
  }

  if (status === 'ACCEPTED') {
    return (
      <View style={[styles.banner, styles.bannerOk]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.primary[700]} style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, styles.titleOk]}>Customer accepted your quote</Text>
          <Text style={[styles.body, styles.bodyOk]}>
            {balanceDueNaira != null && balanceDueNaira > 0
              ? `They can pay the balance of ₦${Number(balanceDueNaira).toLocaleString()} in the app.`
              : 'No further balance is due from the customer.'}
          </Text>
        </View>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bannerWarn: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  bannerOk: { backgroundColor: colors.primary[50], borderColor: colors.primary[200] },
  bannerDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  icon: { marginRight: 10, marginTop: 2 },
  textWrap: { flex: 1 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, marginBottom: 4 },
  titleWarn: { color: '#92400e' },
  titleOk: { color: colors.primary[800] },
  titleDanger: { color: '#991b1b' },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  bodyWarn: { color: '#b45309' },
  bodyOk: { color: colors.primary[800] },
  bodyDanger: { color: '#b91c1c' },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: '#991b1b', marginTop: 6 },
})
