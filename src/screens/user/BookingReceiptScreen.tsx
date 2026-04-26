import React, { useState, useCallback } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native'
import { bookingsAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const NGN = '\u20A6'

export function BookingReceiptScreen({ route }: { route: any }) {
  const navigation = useNavigation()
  const id =
    route?.params != null && route.params.id != null && route.params.id !== ''
      ? String(route.params.id)
      : ''
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!id) {
      setData(null)
      setLoading(false)
      setRefreshing(false)
      return
    }
    try {
      const res = await bookingsAPI.getReceipt(id)
      setData(res.data)
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not load receipt'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  if (!id) {
    return (
      <View style={[styles.empty, { flex: 1 }]}>
        <Text style={styles.emptyText}>This receipt could not be opened.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading && !data) return <LoadingOverlay />

  if (!data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No receipt data</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
      }
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Payment summary</Text>
        <Text style={styles.muted}>Booking ref: {data.bookingId}</Text>
        {data.reference ? (
          <Text style={styles.body}>
            Paystack ref: <Text style={styles.mono}>{data.reference}</Text>
          </Text>
        ) : null}
        <View style={styles.divider} />
        <Text style={styles.row}>
          <Text style={styles.label}>Vehicle: </Text>
          {data.vehicle?.brand} {data.vehicle?.model}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Issue: </Text>
          {data.fault?.name}
        </Text>
        {data.mechanic ? (
          <Text style={styles.row}>
            <Text style={styles.label}>Mechanic: </Text>
            {data.mechanic?.companyName ?? 'Not set'}
          </Text>
        ) : null}
        <Text style={styles.row}>
          <Text style={styles.label}>Status: </Text>
          {data.status}
        </Text>
        {data.paidAt ? (
          <Text style={styles.row}>
            <Text style={styles.label}>Paid at: </Text>
            {new Date(data.paidAt).toLocaleString()}
          </Text>
        ) : null}
        {data.paidAmount != null ? (
          <Text style={styles.amount}>
            {NGN}
            {Number(data.paidAmount).toLocaleString()}
          </Text>
        ) : null}
        {data.estimatedCost != null && data.paidAmount == null ? (
          <Text style={styles.amount}>
            Agreed: {NGN}
            {Number(data.estimatedCost).toLocaleString()}
          </Text>
        ) : null}
        {Array.isArray(data.transactions) && data.transactions.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.section}>Transactions</Text>
            {data.transactions.map((t: any, idx: number) => (
              <View key={t?.id != null ? String(t.id) : `tx-${idx}`} style={styles.txRow}>
                <Text style={styles.txType}>{t.type}</Text>
                <Text style={[styles.txAmt, t.status === 'SUCCESS' && styles.txSuccess]}>
                  {t.status} · {NGN}
                  {((t.amountMinor ?? 0) / 100).toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  card: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  muted: { fontSize: 14, color: colors.neutral[500], marginBottom: 6 },
  body: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  mono: { fontFamily: 'monospace', fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.neutral[200], marginVertical: 16 },
  row: { fontSize: 15, color: colors.text, marginBottom: 8 },
  label: { color: colors.neutral[500] },
  amount: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  txType: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  txAmt: { fontSize: 14, color: colors.neutral[600] },
  txSuccess: { color: colors.accent.green },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  backLink: { paddingVertical: 12, paddingHorizontal: 20 },
  backLinkText: { fontSize: 16, fontWeight: '600', color: colors.primary[600] },
})
