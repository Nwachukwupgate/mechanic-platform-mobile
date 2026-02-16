import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'

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
      <AnimatedFadeIn>
        <Text style={styles.greeting}>Hello, {name}</Text>
      </AnimatedFadeIn>
      <View style={styles.statsRow}>
        <AnimatedFadeIn delay={0} duration={280}>
          <View style={styles.statBox}>
            <IconBadge name="document-text-outline" color={colors.primary[600]} backgroundColor={colors.primary[100]} />
            <Text style={styles.statValue}>{openRequests.length}</Text>
            <Text style={styles.statLabel}>Open requests</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={60} duration={280}>
          <View style={styles.statBox}>
            <IconBadge name="time" color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} />
            <Text style={styles.statValue}>{active.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={120} duration={280}>
          <View style={styles.statBox}>
            <IconBadge name="checkmark-done" color={colors.accent.green} backgroundColor={colors.accent.green + '22'} />
            <Text style={styles.statValue}>{completed.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </AnimatedFadeIn>
      </View>

      {openRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Open requests (quote to win)</Text>
          {openRequests.slice(0, 5).map((b: any) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
              activeOpacity={0.8}
            >
              <Card style={styles.bookingCard}>
                <View style={styles.bookingCardInner}>
                  <IconBadge name="car-sport" size={20} color={colors.primary[600]} backgroundColor={colors.primary[50]} style={styles.bookingIcon} />
                  <View style={styles.bookingContent}>
                    <Text style={styles.vehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                    <View style={styles.faultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.fault}>{b.fault?.name}</Text>
                    </View>
                    <View style={styles.openLabelWrap}>
                      <Ionicons name="pricetag-outline" size={14} color={colors.primary[600]} />
                      <Text style={styles.openLabel}>No quote yet</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
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
              activeOpacity={0.8}
            >
              <Card style={styles.bookingCard}>
                <View style={styles.bookingCardInner}>
                  <IconBadge name="car-sport" size={20} color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} style={styles.bookingIcon} />
                  <View style={styles.bookingContent}>
                    <View style={styles.cardRow}>
                      <Text style={styles.vehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                      <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                        <Text style={styles.statusChipText}>{b.status?.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <View style={styles.faultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.fault}>{b.fault?.name}</Text>
                    </View>
                    {b.estimatedCost != null && (
                      <View style={styles.costRow}>
                        <Ionicons name="cash-outline" size={14} color={colors.accent.green} />
                        <Text style={styles.cost}>₦{Number(b.estimatedCost).toLocaleString()}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.navigate('Bookings')}
        activeOpacity={0.8}
      >
        <IconBadge name="briefcase" size={28} color={colors.primary[600]} backgroundColor={colors.primary[100]} style={styles.primaryCardIcon} />
        <View style={styles.primaryCardText}>
          <Text style={styles.primaryCardTitle}>View all bookings</Text>
          <Text style={styles.primaryCardSub}>Manage and filter your jobs</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.neutral[400]} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.getParent()?.navigate('MechanicJobHistory')}
        activeOpacity={0.8}
      >
        <IconBadge name="checkmark-done" size={28} color={colors.accent.green} backgroundColor={colors.accent.green + '22'} style={styles.primaryCardIcon} />
        <View style={styles.primaryCardText}>
          <Text style={styles.primaryCardTitle}>Job history</Text>
          <Text style={styles.primaryCardSub}>Completed jobs only</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.neutral[400]} />
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
  bookingCardInner: { flexDirection: 'row', alignItems: 'center' },
  bookingIcon: { width: 40, height: 40, borderRadius: 20 },
  bookingContent: { flex: 1, marginLeft: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontSize: 14, color: colors.textSecondary },
  openLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  openLabel: { fontSize: 12, color: colors.primary[600], fontWeight: '600' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cost: { fontSize: 14, fontWeight: '600', color: colors.text },
  seeAll: { fontSize: 14, fontWeight: '600', color: colors.primary[600], marginBottom: 16 },
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  primaryCardIcon: { width: 48, height: 48, borderRadius: 24 },
  primaryCardText: { flex: 1 },
  primaryCardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  primaryCardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
})
