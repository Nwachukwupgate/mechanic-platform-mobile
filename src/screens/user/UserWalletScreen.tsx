import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { walletAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const TYPE_LABELS: Record<string, string> = {
  USER_PAYMENT: 'Payment',
  WITHDRAWAL: 'Withdrawal',
  FEE: 'Fee',
  PAYOUT: 'Payout',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: colors.accent.amber,
  SUCCESS: colors.accent.green,
  FAILED: colors.accent.red,
}

export function UserWalletScreen({ route }: { route: any }) {
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [summaryRes, txRes] = await Promise.all([
        walletAPI.getSummary().catch(() => ({ data: null })),
        walletAPI.getTransactions?.({ limit: 50 }).catch(() => ({ data: { items: [] } })),
      ])
      setSummary(summaryRes.data)
      const txData = txRes.data
      setTransactions(Array.isArray(txData?.items) ? txData.items : [])
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    const ref = route.params?.paymentReference
    if (ref) {
      walletAPI.verifyPayment(ref).then((r) => {
        if (r.data?.success) load()
      }).catch(() => {})
    }
  }, [route.params?.paymentReference])

  if (loading && !summary) return <LoadingOverlay />

  const balance = summary?.balance?.balanceNaira ?? 0

  return (
    <View style={styles.container}>
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={styles.balanceValue}>₦{Number(balance).toLocaleString()}</Text>
      </Card>
      <Text style={styles.sectionTitle}>Recent transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id || item.reference || String(Math.random())}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={40} color={colors.neutral[400]} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={styles.txMain}>
              <Text style={styles.txType}>
                {TYPE_LABELS[item.type] || item.type || 'Transaction'}
              </Text>
              <Text style={styles.txDate}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || colors.neutral[300]) + '22' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || colors.text }]}>
                {item.status || '—'}
              </Text>
            </View>
            {item.amountMinor != null && (
              <Text style={styles.txAmount}>
                ₦{(item.amountMinor / 100).toLocaleString()}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  balanceCard: { margin: 16, marginBottom: 8 },
  balanceLabel: { fontSize: 14, color: colors.textSecondary },
  balanceValue: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  list: { padding: 16, paddingBottom: 32 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral[200] },
  txMain: { flex: 1 },
  txType: { fontSize: 15, fontWeight: '600', color: colors.text },
  txDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  txAmount: { fontSize: 15, fontWeight: '600', color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: 8 },
})
