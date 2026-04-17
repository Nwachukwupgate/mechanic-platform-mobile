import React, { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native'
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
import { DashboardActionTile, useDashboardTileWidth } from '../../components/DashboardActionTile'
import { getGreetingLine } from '../../utils/greeting'

const PAD = 16
const TILE_GAP = 10

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
  const { width: screenW } = useWindowDimensions()
  const tileW = useDashboardTileWidth(PAD, TILE_GAP, screenW)

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

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

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
          <View style={styles.sectionHeader}>
            <Ionicons name="paper-plane-outline" size={18} color={colors.accent.violet} />
            <Text style={styles.sectionTitle}>Sent to you — send a quote</Text>
          </View>
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
                    <Text style={styles.vehicle} numberOfLines={1}>
                      {b.vehicle?.brand} {b.vehicle?.model}
                    </Text>
                    <View style={styles.faultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.fault} numberOfLines={1}>
                        {b.fault?.name}
                      </Text>
                    </View>
                    <View style={styles.openLabelWrap}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary[600]} />
                      <Text style={styles.openLabel}>Direct request · tap to quote</Text>
                    </View>
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
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={18} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>Open requests (quote to win)</Text>
          </View>
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
                    <Text style={styles.vehicle} numberOfLines={1}>
                      {b.vehicle?.brand} {b.vehicle?.model}
                    </Text>
                    <View style={styles.faultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.fault} numberOfLines={1}>
                        {b.fault?.name}
                      </Text>
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
          <View style={styles.sectionHeader}>
            <Ionicons name="reader-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Recent bookings</Text>
          </View>
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
                      <Text style={[styles.vehicle, styles.vehicleFlex]} numberOfLines={1}>
                        {b.vehicle?.brand} {b.vehicle?.model}
                      </Text>
                      <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                        <Text style={styles.statusChipText}>{b.status?.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <View style={styles.faultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.fault} numberOfLines={1}>
                        {b.fault?.name}
                      </Text>
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

      <View style={[styles.actionSection, { paddingHorizontal: PAD }]}>
        <View style={styles.actionSectionHeader}>
          <Ionicons name="grid-outline" size={18} color={colors.primary[600]} />
          <Text style={styles.actionSectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.actionRow}>
          <DashboardActionTile
            width={tileW}
            icon="briefcase"
            title="All bookings"
            subtitle="Quotes & job status"
            iconColor={colors.primary[700]}
            iconBg={colors.primary[100]}
            onPress={() => navigation.navigate('Bookings')}
          />
          <DashboardActionTile
            width={tileW}
            icon="time-outline"
            title="Job history"
            subtitle="Completed & paid"
            iconColor={colors.accent.green}
            iconBg={colors.accent.green + '22'}
            onPress={() => navigation.getParent()?.navigate('MechanicJobHistory')}
          />
        </View>
        <View style={styles.actionRow}>
          <DashboardActionTile
            width={tileW}
            icon="wallet-outline"
            title="Wallet"
            subtitle="Earnings & payouts"
            iconColor={colors.accent[700]}
            iconBg={colors.accent[50]}
            onPress={() => navigation.navigate('Wallet')}
          />
          <DashboardActionTile
            width={tileW}
            icon="person-circle-outline"
            title="Profile"
            subtitle="Workshop & availability"
            iconColor={colors.accent.violet}
            iconBg={colors.accent.violet + '22'}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
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
  scroll: { paddingBottom: 32 },
  hero: {
    marginHorizontal: PAD,
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
  statsRow: { flexDirection: 'row', gap: TILE_GAP, marginBottom: 20, paddingHorizontal: PAD },
  statBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 19, color: colors.text, marginTop: 6 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: PAD,
  },
  sectionTitle: { ...typography.section, color: colors.text, marginBottom: 0, paddingHorizontal: 0 },
  bookingCard: { marginBottom: TILE_GAP, marginHorizontal: PAD },
  bookingCardInner: { flexDirection: 'row', alignItems: 'center' },
  bookingIcon: { width: 40, height: 40, borderRadius: 20 },
  bookingContent: { flex: 1, marginLeft: 12, minWidth: 0 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  vehicle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  vehicleFlex: { flex: 1, minWidth: 0 },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  openLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  openLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary[600] },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cost: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary[600], marginBottom: 16, marginHorizontal: PAD },
  actionSection: { marginTop: 4, marginBottom: 16 },
  actionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  actionSectionTitle: { ...typography.section, color: colors.text },
  actionRow: {
    flexDirection: 'row',
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
})
