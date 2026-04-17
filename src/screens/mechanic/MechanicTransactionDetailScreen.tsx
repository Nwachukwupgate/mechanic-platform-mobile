import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import { walletAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { LoadingOverlay } from '../../components/LoadingOverlay'

type DetailLine = { label: string; value: string }

type FeeSplit = {
  grossNaira: number
  platformFeePercent: number
  mechanicSharePercent: number
  platformKeepsNaira?: number | null
  mechanicShareNaira?: number | null
  directFeeOwedNaira?: number | null
}

type TxDetail = {
  id: string
  type: string
  amountMinor: number
  amountNaira: number
  status: string
  reference?: string | null
  paystackReference?: string | null
  description?: string | null
  createdAt: string
  detailLines?: DetailLine[]
  feeSplit?: FeeSplit
  booking?: {
    id: string
    status?: string
    paidAmount?: number | null
    paymentMethod?: string
    vehicle?: { make?: string; model?: string; year?: number }
    fault?: { title?: string; description?: string }
  } | null
}

export function MechanicTransactionDetailScreen() {
  const route = useRoute<{ key: string; name: string; params: { transactionId: string } }>()
  const transactionId = route.params?.transactionId
  const [detail, setDetail] = useState<TxDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!transactionId) return
    setError(null)
    try {
      const res = await walletAPI.getTransaction(transactionId)
      setDetail(res.data as TxDetail)
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Could not load transaction'))
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  React.useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load().finally(() => setRefreshing(false))
  }

  if (loading && !detail) return <LoadingOverlay />

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Missing transaction'}</Text>
      </View>
    )
  }

  const lines = detail.detailLines ?? []
  const b = detail.booking

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.typeBadge}>{detail.type.replace(/_/g, ' ')}</Text>
      <Text style={styles.amount}>
        {'\u20A6'}
        {detail.amountNaira.toLocaleString()}
      </Text>
      <Text style={styles.status}>Status: {detail.status}</Text>
      <Text style={styles.date}>
        {new Date(detail.createdAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </Text>

      {detail.description ? <Text style={styles.desc}>{detail.description}</Text> : null}

      {detail.feeSplit ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>How this payment splits</Text>
          <Text style={styles.cardLine}>
            Customer job total: {'\u20A6'}
            {detail.feeSplit.grossNaira.toLocaleString()}
          </Text>
          <Text style={styles.cardLine}>
            Platform fee: {detail.feeSplit.platformFeePercent}% · Your share:{' '}
            {detail.feeSplit.mechanicSharePercent}%
          </Text>
          {detail.feeSplit.platformKeepsNaira != null ? (
            <Text style={styles.cardLine}>
              Platform retains {'\u20A6'}
              {detail.feeSplit.platformKeepsNaira.toLocaleString()} (on platform-paid jobs your 80% share
              accrues as withdrawable balance).
            </Text>
          ) : null}
          {detail.feeSplit.directFeeOwedNaira != null ? (
            <Text style={styles.cardLine}>
              On direct payments you received the full amount from the customer; this job has a platform
              fee of {'\u20A6'}
              {detail.feeSplit.directFeeOwedNaira.toLocaleString()} (20%).
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        {lines.map((row, i) => (
          <View key={`${row.label}-${i}`} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </Card>

      {b ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Booking</Text>
          <Text style={styles.cardLine}>ID: {b.id.slice(0, 8)}…</Text>
          {b.vehicle ? (
            <Text style={styles.cardLine}>
              {[b.vehicle.year, b.vehicle.make, b.vehicle.model].filter(Boolean).join(' ')}
            </Text>
          ) : null}
          {b.fault?.title ? <Text style={styles.cardLine}>{b.fault.title}</Text> : null}
        </Card>
      ) : null}

      {detail.reference || detail.paystackReference ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>References</Text>
          {detail.reference ? (
            <Text style={styles.mono} selectable>
              {detail.reference}
            </Text>
          ) : null}
          {detail.paystackReference ? (
            <Text style={[styles.mono, { marginTop: 8 }]} selectable>
              Paystack: {detail.paystackReference}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  err: { color: colors.accent.red, textAlign: 'center', fontSize: 15 },
  typeBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amount: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 4 },
  status: { fontSize: 14, color: colors.textSecondary },
  date: { fontSize: 13, color: colors.neutral[500], marginTop: 4, marginBottom: 12 },
  desc: { fontSize: 15, color: colors.text, marginBottom: 16, lineHeight: 22 },
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  cardLine: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  rowLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  mono: { fontSize: 12, color: colors.neutral[600], fontFamily: 'monospace' },
})
