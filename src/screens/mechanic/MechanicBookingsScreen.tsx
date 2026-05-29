import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { fonts } from '../../theme/fonts'
import { bookingStatusBadgeColors, bookingStatusLabel } from '../../utils/bookingStatusBadge'
import { useBookingListRealtime } from '../../hooks/useBookingListRealtime'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'REQUESTED', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'In progress' },
]

export function MechanicBookingsScreen({ navigation }: { navigation: any }) {
  const [list, setList] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await bookingsAPI.getAll()
      setList(res.data || [])
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  useBookingListRealtime(load)

  const filtered = filter === 'ALL'
    ? list
    : list.filter((b: any) => b.status === filter)

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="briefcase-outline" size={48} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySub}>Your assigned jobs will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = bookingStatusBadgeColors(item.status)
          return (
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('MechanicBookingDetail', { id: item.id })} activeOpacity={0.8}>
              <Card style={styles.card}>
                <View style={styles.cardInner}>
                  <IconBadge name="car-sport" size={22} color={colors.primary[600]} backgroundColor={colors.primary[50]} style={styles.cardIcon} />
                  <View style={styles.cardBody}>
                    <Text style={styles.vehicle} numberOfLines={2}>
                      {item.vehicle?.brand} {item.vehicle?.model}
                    </Text>
                    <View style={styles.faultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.fault} numberOfLines={2}>
                        {item.fault?.name}
                      </Text>
                    </View>
                    <View style={styles.customerRow}>
                      <Ionicons name="person-outline" size={14} color={colors.primary[600]} />
                      <Text style={styles.customer} numberOfLines={1}>
                        {item.user?.firstName} {item.user?.lastName}
                      </Text>
                    </View>
                    {item.estimatedCost != null && (
                      <View style={styles.costRow}>
                        <Ionicons name="cash-outline" size={14} color={colors.accent.green} />
                        <Text style={styles.cost}>₦{Number(item.estimatedCost).toLocaleString()}</Text>
                      </View>
                    )}
                    <View style={[styles.statusChip, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusChipText, { color: badge.fg }]}>
                        {bookingStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.neutral[100] },
  filterChipActive: { backgroundColor: colors.primary[600] },
  filterChipText: { fontSize: 14, color: colors.text },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: { marginBottom: 12 },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 42, height: 42, borderRadius: 21 },
  cardBody: { flex: 1, marginLeft: 14, minWidth: 0 },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontSize: 14, color: colors.textSecondary, flex: 1, minWidth: 0 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  customer: { fontSize: 13, color: colors.primary[600], flex: 1, minWidth: 0 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cost: { fontSize: 14, fontWeight: '600', color: colors.text },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 0.15 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
})
