import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

export function JobHistoryScreen({ navigation }: { navigation: any }) {
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
            <View style={styles.emptyIconWrap}>
              <Ionicons name="checkmark-done-outline" size={48} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyText}>No completed jobs yet</Text>
            <Text style={styles.emptySub}>Completed bookings will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('BookingDetail', { id: item.id })}
            activeOpacity={0.8}
          >
            <Card style={styles.card}>
              <View style={styles.cardInner}>
                <IconBadge name="car-sport" size={22} color={colors.accent.green} backgroundColor={colors.accent.green + '22'} style={styles.cardIcon} />
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <Text style={styles.vehicle}>{item.vehicle?.brand} {item.vehicle?.model}</Text>
                    <View style={styles.statusChip}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.accent.green} />
                      <Text style={styles.statusChipText}>{item.status}</Text>
                    </View>
                  </View>
                  <View style={styles.faultRow}>
                    <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.fault}>{item.fault?.name}</Text>
                  </View>
                  {item.mechanic ? (
                    <View style={styles.mechRow}>
                      <Text style={styles.mech}>{item.mechanic.companyName}</Text>
                      {item.actualCost != null && (
                        <Text style={styles.cost}>₦{Number(item.actualCost).toLocaleString()}</Text>
                      )}
                    </View>
                  ) : null}
                  {item.completedAt && (
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.date}>
                        {new Date(item.completedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
              </View>
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
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 42, height: 42, borderRadius: 21 },
  cardBody: { flex: 1, marginLeft: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent.green + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.accent.green },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontSize: 14, color: colors.textSecondary },
  mechRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  mech: { fontSize: 14, color: colors.primary[600] },
  cost: { fontSize: 14, fontWeight: '600', color: colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  date: { fontSize: 12, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 20 },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
})
