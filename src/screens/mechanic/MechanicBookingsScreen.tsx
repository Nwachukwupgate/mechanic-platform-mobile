import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: colors.accent.amber,
  ACCEPTED: colors.primary[600],
  IN_PROGRESS: colors.accent.violet,
  DONE: colors.accent.green,
  PAID: colors.neutral[600],
}

export function MechanicBookingsScreen({ navigation }: { navigation: any }) {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await bookingsAPI.getAll()
      setList(res.data || [])
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', load)
    return unsub
  }, [navigation, load])

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('MechanicBookingDetail', { id: item.id })} activeOpacity={0.8}>
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.vehicle}>{item.vehicle?.brand} {item.vehicle?.model}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || colors.neutral[300] }]}>
                  <Text style={styles.badgeText}>{item.status?.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.fault}>{item.fault?.name}</Text>
              <Text style={styles.customer}>{item.user?.firstName} {item.user?.lastName}</Text>
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
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  fault: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  customer: { fontSize: 12, color: colors.primary[600], marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 },
})
