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
import { DashboardActionTile } from '../../components/DashboardActionTile'
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
            <Ionicons name="briefcase" size={15} color={colors.primary[700]} />
            <Text style={styles.heroBadgeText}>Workshop dashboard</Text>
          </View>
          <Text style={styles.greeting}>{getGreetingLine(name)}</Text>
          <View style={styles.heroAccent} />
          <Text style={styles.greetingSub}>Quote open jobs, chat with customers, get paid.</Text>
        </AnimatedFadeIn>
      </LinearGradient>
      <View style={styles.statsRow}>
        <AnimatedFadeIn delay={0} duration={280} style={styles.statCellWrap}>
          <View style={[styles.statBox, styles.statBoxOpen, styles.statOpenCard, styles.statFill]}>
            <IconBadge
              name="document-text-outline"
              size={22}
              color={colors.primary[600]}
              backgroundColor={colors.primary[100]}
              style={styles.statIconOpen}
            />
            <Text style={styles.statValueOpen}>{openRequests.length}</Text>
            <Text style={styles.statLabelOpen}>Open</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={60} duration={280} style={styles.statCellWrap}>
          <View style={[styles.statBox, styles.statBoxLarge, styles.statActiveCard, styles.statFill]}>
            <IconBadge
              name="time"
              size={28}
              color={colors.accent.violet}
              backgroundColor="rgba(139, 92, 246, 0.16)"
              style={styles.statIconLarge}
            />
            <Text style={styles.statValueLarge}>{active.length}</Text>
            <Text style={styles.statLabelLarge}>Active</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={120} duration={280} style={styles.statCellWrap}>
          <View style={[styles.statBox, styles.statBoxLarge, styles.statDoneCard, styles.statFill]}>
            <IconBadge
              name="checkmark-done"
              size={28}
              color={colors.accent.green}
              backgroundColor="rgba(16, 185, 129, 0.18)"
              style={styles.statIconLarge}
            />
            <Text style={styles.statValueLarge}>{completed.length}</Text>
            <Text style={styles.statLabelLarge}>Done</Text>
          </View>
        </AnimatedFadeIn>
      </View>

      {pending.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
              <Ionicons name="paper-plane-outline" size={18} color={colors.accent.violet} />
            </View>
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
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary[100] }]}>
              <Ionicons name="flash-outline" size={18} color={colors.primary[600]} />
            </View>
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
            <View style={styles.sectionIconWrap}>
              <Ionicons name="reader-outline" size={18} color={colors.neutral[600]} />
            </View>
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
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary[100] }]}>
            <Ionicons name="grid-outline" size={18} color={colors.primary[600]} />
          </View>
          <Text style={styles.actionSectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.actionRow}>
          <DashboardActionTile
            icon="briefcase"
            title="All bookings"
            subtitle="Quotes & job status"
            iconColor={colors.primary[700]}
            iconBg={colors.primary[100]}
            onPress={() => navigation.navigate('Bookings')}
          />
          <DashboardActionTile
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
            icon="wallet-outline"
            title="Wallet"
            subtitle="Earnings & payouts"
            iconColor={colors.accent[700]}
            iconBg={colors.accent[50]}
            onPress={() => navigation.navigate('Wallet')}
          />
          <DashboardActionTile
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
  scroll: { paddingBottom: 36, width: '100%' },
  hero: {
    marginHorizontal: PAD,
    marginTop: 10,
    marginBottom: 22,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(8, 108, 64, 0.12)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroBadgeText: { ...typography.captionStrong, fontSize: 12, color: colors.primary[800], letterSpacing: 0.2 },
  greeting: {
    ...typography.title,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 32,
    color: colors.text,
  },
  heroAccent: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[500],
    marginTop: 14,
    opacity: 0.85,
  },
  greetingSub: {
    ...typography.body,
    color: colors.neutral[600],
    marginTop: 12,
    lineHeight: 23,
    fontSize: 15,
    maxWidth: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
    paddingHorizontal: PAD,
    alignItems: 'stretch',
    alignSelf: 'stretch',
    width: '100%',
  },
  /** Row child must flex — inner stat card then fills this. */
  statCellWrap: {
    flex: 1,
    minWidth: 0,
  },
  statFill: {
    flex: 1,
    width: '100%',
  },
  statBox: {
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  statBoxOpen: {
    paddingVertical: 18,
    paddingHorizontal: 6,
    minHeight: 132,
    borderRadius: 18,
    borderTopWidth: 2,
    borderTopColor: colors.primary[500],
  },
  statOpenCard: {
    backgroundColor: colors.surface,
  },
  statBoxLarge: {
    paddingVertical: 22,
    paddingHorizontal: 12,
    minHeight: 132,
    borderRadius: 22,
    borderTopWidth: 4,
  },
  statActiveCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderTopColor: colors.accent.violet,
    shadowColor: colors.accent.violet,
    shadowOpacity: 0.1,
  },
  statDoneCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.07)',
    borderColor: 'rgba(16, 185, 129, 0.22)',
    borderTopColor: colors.accent.green,
    shadowColor: colors.accent.green,
    shadowOpacity: 0.08,
  },
  statIconOpen: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statIconLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  statValueOpen: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  statLabelOpen: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  statValueLarge: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.text,
    marginTop: 12,
    letterSpacing: -0.9,
  },
  statLabelLarge: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.neutral[600],
    marginTop: 5,
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: PAD,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.section,
    flex: 1,
    fontSize: 17,
    letterSpacing: -0.35,
    color: colors.text,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  bookingCard: {
    marginBottom: 12,
    marginHorizontal: PAD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  bookingCardInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  bookingIcon: { width: 44, height: 44, borderRadius: 22 },
  bookingContent: { flex: 1, marginLeft: 14, minWidth: 0 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  vehicle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  vehicleFlex: { flex: 1, minWidth: 0 },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  openLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  openLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary[600] },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexShrink: 0 },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.text, letterSpacing: 0.2 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cost: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  seeAll: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primary[600],
    marginBottom: 18,
    marginHorizontal: PAD,
    marginTop: 4,
  },
  actionSection: { marginTop: 8, marginBottom: 20, alignSelf: 'stretch' },
  actionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  actionSectionTitle: {
    ...typography.section,
    fontSize: 17,
    letterSpacing: -0.35,
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
    alignSelf: 'stretch',
  },
})
