import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: colors.accent.amber,
  ACCEPTED: colors.primary[600],
  IN_PROGRESS: colors.accent.violet,
  DONE: colors.accent.green,
  PAID: colors.neutral[600],
}

export function BookingsScreen({ navigation }: { navigation: any }) {
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
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={48} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySub}>Find mechanics and request a service to see them here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('BookingDetail', { id: item.id })} activeOpacity={0.8}>
            <Card style={styles.card}>
              <View style={styles.cardInner}>
                <IconBadge name="car-sport" size={22} color={colors.primary[600]} backgroundColor={colors.primary[50]} style={styles.cardIcon} />
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <Text style={styles.vehicle}>{item.vehicle?.brand} {item.vehicle?.model}</Text>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || colors.neutral[300] }]}>
                      <Text style={styles.badgeText}>{item.status?.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <View style={styles.faultRow}>
                    <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.fault}>{item.fault?.name}</Text>
                  </View>
                  {item.mechanic ? (
                    <View style={styles.mechRow}>
                      <Ionicons name="person-outline" size={14} color={colors.primary[600]} />
                      <Text style={styles.mech}>{item.mechanic.companyName}</Text>
                    </View>
                  ) : null}
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
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontSize: 14, color: colors.textSecondary },
  mechRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  mech: { fontSize: 13, color: colors.primary[600] },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
})
