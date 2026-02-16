import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

export function MechanicJobHistoryScreen({ navigation }: { navigation: any }) {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await bookingsAPI.getAll()
      const all = res.data || []
      const completed = all.filter((b: any) => COMPLETED_STATUSES.includes(b.status))
      setList(completed)
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyText}>No completed jobs yet</Text>
            <Text style={styles.emptySub}>Completed jobs will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('MechanicBookingDetail', { id: item.id })}
            activeOpacity={0.8}
          >
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.vehicle}>{item.vehicle?.brand} {item.vehicle?.model}</Text>
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.fault}>{item.fault?.name}</Text>
              <Text style={styles.customer}>{item.user?.firstName} {item.user?.lastName}</Text>
              {(item.actualCost != null || item.estimatedCost != null) && (
                <Text style={styles.cost}>
                  ₦{Number(item.actualCost ?? item.estimatedCost).toLocaleString()}
                </Text>
              )}
              {item.completedAt && (
                <Text style={styles.date}>
                  {new Date(item.completedAt).toLocaleDateString()}
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  statusChip: { backgroundColor: colors.accent.green + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.accent.green },
  fault: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  customer: { fontSize: 14, color: colors.primary[600], marginTop: 4 },
  cost: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
})
