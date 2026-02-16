import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

export function DashboardScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((s) => s.user)
  const name = user?.firstName || user?.email?.split('@')[0] || 'User'
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await bookingsAPI.getAll()
      setBookings(Array.isArray(res.data) ? res.data : [])
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const total = bookings.length
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length
  const completed = bookings.filter((b) => COMPLETED_STATUSES.includes(b.status)).length
  const recent = bookings
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
    >
      <Text style={styles.greeting}>Hello, {name}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="time" size={24} color={colors.primary[600]} />
          <Text style={styles.statValue}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="document-text" size={24} color={colors.accent.violet} />
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="checkmark-done" size={24} color={colors.accent.green} />
          <Text style={styles.statValue}>{completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {recent.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent bookings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recent.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.getParent()?.navigate('BookingDetail', { id: b.id })}
            >
              <Card style={styles.recentCard}>
                <Text style={styles.recentVehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                <Text style={styles.recentFault}>{b.fault?.name}</Text>
                <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                  <Text style={styles.statusChipText}>{b.status?.replace('_', ' ')}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Card style={styles.card}>
        <Ionicons name="car-sport" size={40} color={colors.primary[600]} />
        <Text style={styles.cardTitle}>Find a mechanic</Text>
        <Text style={styles.cardSub}>Select your vehicle and issue, then search for nearby verified mechanics or post a job for quotes.</Text>
        <View style={styles.cardBtn}>
          <Text style={styles.cardBtnText} onPress={() => navigation.navigate('FindMechanics')}>Find mechanics →</Text>
        </View>
      </Card>
      <Card style={styles.card}>
        <Ionicons name="list" size={40} color={colors.accent.violet} />
        <Text style={styles.cardTitle}>My bookings</Text>
        <Text style={styles.cardSub}>View and manage your service requests.</Text>
        <View style={styles.cardBtn}>
          <Text style={styles.cardBtnText} onPress={() => navigation.navigate('Bookings')}>View bookings →</Text>
        </View>
      </Card>
      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.getParent()?.navigate('JobHistory')}>
          <Ionicons name="checkmark-done" size={22} color={colors.primary[600]} />
          <Text style={styles.quickLinkText}>Job history</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.getParent()?.navigate('UserWallet')}>
          <Ionicons name="wallet" size={22} color={colors.primary[600]} />
          <Text style={styles.quickLinkText}>Wallet</Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  seeAll: { fontSize: 14, fontWeight: '600', color: colors.primary[600] },
  recentCard: { marginBottom: 10 },
  recentVehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  recentFault: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 },
  cardSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  cardBtn: { marginTop: 12 },
  cardBtnText: { fontSize: 16, color: colors.primary[600], fontWeight: '600' },
  quickLinks: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: 12 },
  quickLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
})
