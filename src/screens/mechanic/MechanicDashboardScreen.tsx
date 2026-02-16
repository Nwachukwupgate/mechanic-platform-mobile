import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

export function MechanicDashboardScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((s) => s.user)
  const name = user?.companyName || user?.ownerFullName || user?.email?.split('@')[0] || 'Mechanic'
  const [openRequests, setOpenRequests] = useState<any[]>([])
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [openRes, allRes] = await Promise.all([
        bookingsAPI.getOpenRequests().catch(() => ({ data: [] })),
        bookingsAPI.getAll(),
      ])
      setOpenRequests(Array.isArray(openRes.data) ? openRes.data : [])
      const all = allRes.data || []
      setMyBookings(all)
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    const unsub = navigation?.addListener?.('focus', load)
    return () => { unsub?.() }
  }, [navigation, load])

  const pending = myBookings.filter((b: any) => b.status === 'REQUESTED' && b.mechanicId)
  const active = myBookings.filter((b: any) => ACTIVE_STATUSES.includes(b.status))
  const completed = myBookings.filter((b: any) => COMPLETED_STATUSES.includes(b.status))
  const recent = [...myBookings]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  if (loading) return <LoadingOverlay />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
      }
    >
      <Text style={styles.greeting}>Hello, {name}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary[600]} />
          <Text style={styles.statValue}>{openRequests.length}</Text>
          <Text style={styles.statLabel}>Open requests</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="time" size={24} color={colors.accent.violet} />
          <Text style={styles.statValue}>{active.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="checkmark-done" size={24} color={colors.accent.green} />
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {openRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Open requests (quote to win)</Text>
          {openRequests.slice(0, 5).map((b: any) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
            >
              <Card style={styles.bookingCard}>
                <Text style={styles.vehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                <Text style={styles.fault}>{b.fault?.name}</Text>
                <Text style={styles.openLabel}>No quote yet</Text>
              </Card>
            </TouchableOpacity>
          ))}
          {openRequests.length > 5 && (
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
              <Text style={styles.seeAll}>See all open requests →</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {recent.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent bookings</Text>
          {recent.map((b: any) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
            >
              <Card style={styles.bookingCard}>
                <View style={styles.cardRow}>
                  <Text style={styles.vehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                  <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                    <Text style={styles.statusChipText}>{b.status?.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.fault}>{b.fault?.name}</Text>
                {b.estimatedCost != null && (
                  <Text style={styles.cost}>₦{Number(b.estimatedCost).toLocaleString()}</Text>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.navigate('Bookings')}
      >
        <Ionicons name="briefcase" size={36} color={colors.primary[600]} />
        <Text style={styles.primaryCardTitle}>View all bookings</Text>
        <Text style={styles.primaryCardSub}>Manage and filter your jobs</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.getParent()?.navigate('MechanicJobHistory')}
      >
        <Ionicons name="checkmark-done" size={36} color={colors.accent.green} />
        <Text style={styles.primaryCardTitle}>Job history</Text>
        <Text style={styles.primaryCardSub}>Completed jobs only</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function statusColor(status: string): string {
  switch (status) {
    case 'DONE':
    case 'PAID':
    case 'DELIVERED':
      return colors.accent.green + '22'
    case 'IN_PROGRESS':
    case 'ACCEPTED':
      return colors.primary[100]
    default:
      return colors.neutral[200]
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  bookingCard: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  fault: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  openLabel: { fontSize: 12, color: colors.primary[600], marginTop: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  cost: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },
  seeAll: { fontSize: 14, fontWeight: '600', color: colors.primary[600], marginBottom: 16 },
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  primaryCardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  primaryCardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
})
