import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { bookingsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { gradients } from '../../theme/gradients'
import { typography } from '../../theme/typography'
import { fonts } from '../../theme/fonts'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'
import { getGreetingLine } from '../../utils/greeting'

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

export function MechanicDashboardScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((s) => s.user)
  const justLoggedIn = useAuthStore((s) => s.justLoggedIn)
  const clearJustLoggedIn = useAuthStore((s) => s.clearJustLoggedIn)
  const name = user?.companyName || user?.ownerFullName || user?.email?.split('@')[0] || 'there'
  const [openRequests, setOpenRequests] = useState<any[]>([])
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (justLoggedIn && name) {
      clearJustLoggedIn()
      Alert.alert('Welcome back!', `Great to see you, ${name}. Here’s your job overview.`, [{ text: 'Thanks' }])
    }
  }, [justLoggedIn, name, clearJustLoggedIn])

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
      <LinearGradient colors={[...gradients.heroRich]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <AnimatedFadeIn>
          <View style={styles.heroBadge}>
            <Ionicons name="briefcase" size={14} color={colors.primary[700]} />
            <Text style={styles.heroBadgeText}>Workshop dashboard</Text>
          </View>
          <Text style={styles.greeting}>{getGreetingLine(name)}</Text>
          <Text style={styles.greetingSub}>Quote open jobs, chat with customers, get paid.</Text>
        </AnimatedFadeIn>
      </LinearGradient>
      <View style={styles.statsRow}>
        <AnimatedFadeIn delay={0} duration={280}>
          <View style={[styles.statBox, { borderTopColor: colors.primary[500] }]}>
            <IconBadge name="document-text-outline" color={colors.primary[600]} backgroundColor={colors.primary[100]} />
            <Text style={styles.statValue}>{openRequests.length}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={60} duration={280}>
          <View style={[styles.statBox, { borderTopColor: colors.accent.violet }]}>
            <IconBadge name="time" color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} />
            <Text style={styles.statValue}>{active.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={120} duration={280}>
          <View style={[styles.statBox, { borderTopColor: colors.accent.green }]}>
            <IconBadge name="checkmark-done" color={colors.accent.green} backgroundColor={colors.accent.green + '22'} />
            <Text style={styles.statValue}>{completed.length}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </AnimatedFadeIn>
      </View>

      {pending.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Sent to you — send a quote</Text>
          {pending.slice(0, 5).map((b: any) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
              activeOpacity={0.8}
            >
              <Card style={styles.bookingCard}>
                <View style={styles.bookingCardInner}>
                  <IconBadge name="person" size={20} color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} style={styles.bookingIcon} />
                  <View style={styles.bookingContent}>
                    <Text style={styles.vehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                    <Text style={styles.fault}>{b.fault?.name}</Text>
                    <Text style={styles.openLabel}>Direct request · tap to quote</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

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

      <LinearGradient colors={[colors.surface, colors.primary[50]]} style={styles.primaryCardShell}>
        <TouchableOpacity style={styles.primaryCard} onPress={() => navigation.navigate('Bookings')} activeOpacity={0.8}>
          <IconBadge name="briefcase" size={28} color={colors.primary[600]} backgroundColor={colors.primary[100]} style={styles.primaryCardIcon} />
          <View style={styles.primaryCardText}>
            <Text style={styles.primaryCardTitle}>All bookings</Text>
            <Text style={styles.primaryCardSub}>Filter and update job status</Text>
          </View>
          <View style={styles.primaryCardChevron}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary[600]} />
          </View>
        </TouchableOpacity>
      </LinearGradient>
      <LinearGradient colors={[colors.surface, colors.accent[50]]} style={styles.primaryCardShell}>
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => navigation.getParent()?.navigate('MechanicJobHistory')}
          activeOpacity={0.8}
        >
          <IconBadge name="checkmark-done" size={28} color={colors.accent.green} backgroundColor={colors.accent.green + '22'} style={styles.primaryCardIcon} />
          <View style={styles.primaryCardText}>
            <Text style={styles.primaryCardTitle}>Job history</Text>
            <Text style={styles.primaryCardSub}>Completed and paid jobs</Text>
          </View>
          <View style={styles.primaryCardChevron}>
            <Ionicons name="chevron-forward" size={20} color={colors.accent[600]} />
          </View>
        </TouchableOpacity>
      </LinearGradient>
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
  scroll: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.surface + 'ee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  heroBadgeText: { ...typography.captionStrong, fontSize: 12, color: colors.primary[800] },
  greeting: { ...typography.title, color: colors.text },
  greetingSub: { ...typography.body, color: colors.textSecondary, marginTop: 8, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, paddingHorizontal: 16 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, marginTop: 6 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.section, color: colors.text, marginBottom: 12, paddingHorizontal: 16 },
  bookingCard: { marginBottom: 10, marginHorizontal: 16 },
  bookingCardInner: { flexDirection: 'row', alignItems: 'center' },
  bookingIcon: { width: 40, height: 40, borderRadius: 20 },
  bookingContent: { flex: 1, marginLeft: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  openLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  openLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary[600] },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cost: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary[600], marginBottom: 16, marginHorizontal: 16 },
  primaryCardShell: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 22,
    padding: 2,
    overflow: 'hidden',
  },
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 0,
  },
  primaryCardIcon: { width: 48, height: 48, borderRadius: 24 },
  primaryCardText: { flex: 1 },
  primaryCardTitle: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
  primaryCardSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  primaryCardChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
})
