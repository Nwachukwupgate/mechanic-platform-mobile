import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'

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
          <IconBadge name="time" color={colors.primary[600]} backgroundColor={colors.primary[100]} />
          <Text style={styles.statValue}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <IconBadge name="document-text" color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} />
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <IconBadge name="checkmark-done" color={colors.accent.green} backgroundColor={colors.accent.green + '22'} />
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
              activeOpacity={0.8}
            >
              <Card style={styles.recentCard}>
                <View style={styles.recentCardInner}>
                  <IconBadge name="car-sport" size={20} color={colors.primary[600]} backgroundColor={colors.primary[50]} style={styles.recentIcon} />
                  <View style={styles.recentContent}>
                    <Text style={styles.recentVehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                    <View style={styles.recentFaultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.recentFault}>{b.fault?.name}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                      <Text style={styles.statusChipText}>{b.status?.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Card style={styles.card}>
        <View style={styles.cardIconWrap}>
          <IconBadge name="car-sport" size={28} color={colors.primary[600]} backgroundColor={colors.primary[100]} style={styles.cardIconBadge} />
        </View>
        <Text style={styles.cardTitle}>Find a mechanic</Text>
        <Text style={styles.cardSub}>Select your vehicle and issue, then search for nearby verified mechanics or post a job for quotes.</Text>
        <TouchableOpacity style={styles.cardBtn} onPress={() => navigation.navigate('FindMechanics')} activeOpacity={0.8}>
          <Text style={styles.cardBtnText}>Find mechanics</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary[600]} />
        </TouchableOpacity>
      </Card>
      <Card style={styles.card}>
        <View style={styles.cardIconWrap}>
          <IconBadge name="list" size={28} color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} style={styles.cardIconBadge} />
        </View>
        <Text style={styles.cardTitle}>My bookings</Text>
        <Text style={styles.cardSub}>View and manage your service requests.</Text>
        <TouchableOpacity style={styles.cardBtn} onPress={() => navigation.navigate('Bookings')} activeOpacity={0.8}>
          <Text style={styles.cardBtnText}>View bookings</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary[600]} />
        </TouchableOpacity>
      </Card>
      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.getParent()?.navigate('JobHistory')} activeOpacity={0.8}>
          <View style={styles.quickLinkIconWrap}>
            <Ionicons name="checkmark-done" size={22} color={colors.primary[600]} />
          </View>
          <Text style={styles.quickLinkText}>Job history</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.getParent()?.navigate('UserWallet')} activeOpacity={0.8}>
          <View style={styles.quickLinkIconWrap}>
            <Ionicons name="wallet" size={22} color={colors.primary[600]} />
          </View>
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
  recentCardInner: { flexDirection: 'row', alignItems: 'center' },
  recentIcon: { width: 40, height: 40, borderRadius: 20 },
  recentContent: { flex: 1, marginLeft: 14 },
  recentVehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  recentFaultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recentFault: { fontSize: 14, color: colors.textSecondary },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  card: { marginBottom: 16 },
  cardIconWrap: { marginBottom: 4 },
  cardIconBadge: { width: 48, height: 48, borderRadius: 24 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 8 },
  cardSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  cardBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  cardBtnText: { fontSize: 16, color: colors.primary[600], fontWeight: '600' },
  quickLinks: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100] },
  quickLinkIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
})
