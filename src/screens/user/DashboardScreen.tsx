import React, { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { bookingsAPI, vehiclesAPI, notificationsAPI } from '../../services/api'
import { getCurrentPosition } from '../../utils/location'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { fonts } from '../../theme/fonts'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'
import { DashboardActionTile } from '../../components/DashboardActionTile'
import { HeroDecorativeRings } from '../../components/HeroDecorativeRings'
import { getGreetingLine } from '../../utils/greeting'
import { bookingStatusBadgeColors, bookingStatusLabel } from '../../utils/bookingStatusBadge'
import { layout } from '../../theme/layout'
import { Button } from '../../components/Button'

const PAD = layout.screenPaddingHorizontal
const TILE_GAP = 10
const LIST_PREVIEW = 3

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

const FALLBACK_LAT = 6.5244
const FALLBACK_LNG = 3.3792

export function DashboardScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const justLoggedIn = useAuthStore((s) => s.justLoggedIn)
  const clearJustLoggedIn = useAuthStore((s) => s.clearJustLoggedIn)
  const name = user?.firstName || user?.email?.split('@')[0] || 'there'
  const [bookings, setBookings] = useState<any[]>([])
  const [nearby, setNearby] = useState<any[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadActivity, setUnreadActivity] = useState(0)
  useEffect(() => {
    if (justLoggedIn && name) {
      clearJustLoggedIn()
      Alert.alert('Welcome back!', `Great to see you, ${name}. Here’s your booking overview.`, [{ text: 'Thanks' }])
    }
  }, [justLoggedIn, name, clearJustLoggedIn])

  const load = useCallback(async () => {
    try {
      const pos = await getCurrentPosition()
      const lat = pos.lat ?? FALLBACK_LAT
      const lng = pos.lng ?? FALLBACK_LNG

      const [bookRes, vehRes, unreadRes] = await Promise.all([
        bookingsAPI.getAll(),
        vehiclesAPI.getAll().catch(() => ({ data: [] })),
        notificationsAPI.unreadCount().catch(() => ({ data: { count: 0 } })),
      ])
      const uc = (unreadRes as { data?: { count?: number } }).data?.count
      setUnreadActivity(typeof uc === 'number' ? uc : 0)
      setBookings(Array.isArray(bookRes.data) ? bookRes.data : [])

      setNearbyLoading(true)
      const vehicleId =
        Array.isArray(vehRes.data) && vehRes.data[0]?.id ? vehRes.data[0].id : undefined
      const nearRes = await bookingsAPI
        .findNearbyMechanics(lat, lng, undefined, 20, vehicleId)
        .catch(() => ({ data: [] }))
      const list = Array.isArray(nearRes.data) ? nearRes.data : []
      setNearby(list.slice(0, 16))
    } catch (_) {
      setBookings([])
      setNearby([])
      setUnreadActivity(0)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setNearbyLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('dark')
    }, [])
  )

  const total = bookings.length
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length
  const completed = bookings.filter((b) => COMPLETED_STATUSES.includes(b.status)).length
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
  const recentPreview = sortedBookings.slice(0, LIST_PREVIEW)
  const showRecentSeeAll = sortedBookings.length > LIST_PREVIEW

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    )
  }

  const heroPadTop = Math.max(insets.top, 10) + 8

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            load()
          }}
        />
      }
    >
      <View style={styles.heroShell}>
        <HeroDecorativeRings />
        <View style={[styles.heroInner, { paddingTop: heroPadTop }]}>
          <View style={styles.heroTop}>
            <View style={styles.logoChip}>
              <View style={styles.logoDot}>
                <Ionicons name="car-sport" size={12} color="#fff" />
              </View>
              <Text style={styles.logoChipText} numberOfLines={1}>
                Denicksen Auto
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.getParent()?.navigate('Notifications')}
              accessibilityLabel="Activity and updates"
              accessibilityHint="Opens your in-app notifications inbox"
            >
              <Ionicons name="notifications-outline" size={20} color="#f8fafc" />
              {unreadActivity > 0 ? <View style={styles.notifDot} /> : null}
            </TouchableOpacity>
          </View>

          <AnimatedFadeIn>
            <Text style={styles.greeting}>{getGreetingLine(name)}</Text>
            <Text style={styles.greetingSub}>Track quotes, chat, and payments in one place.</Text>
            <View style={styles.heroStatRow}>
              <View style={[styles.statPill, styles.statPillActive]}>
                <Text style={styles.statPillValue}>{active}</Text>
                <Text style={[styles.statPillLabel, styles.statPillLabelOnGreen]}>Active</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{total}</Text>
                <Text style={styles.statPillLabel}>Total</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{completed}</Text>
                <Text style={styles.statPillLabel}>Done</Text>
              </View>
            </View>
          </AnimatedFadeIn>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent bookings</Text>
        {showRecentSeeAll ? (
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')} hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {(recentPreview.length > 0) ? (
        <>
          {recentPreview.map((b, i) => {
            const badge = bookingStatusBadgeColors(b.status)
            return (
              <AnimatedFadeIn key={b.id} delay={120 + i * 40} duration={260}>
                <TouchableOpacity
                  onPress={() => navigation.getParent()?.navigate('BookingDetail', { id: b.id })}
                  activeOpacity={0.8}
                >
                  <Card style={styles.recentCard}>
                    <View style={styles.recentCardInner}>
                      <IconBadge
                        name="car-sport"
                        size={20}
                        color={colors.brand.primary}
                        backgroundColor={colors.primary[100]}
                        style={styles.recentIcon}
                      />
                      <View style={styles.recentContent}>
                        <Text style={styles.recentVehicle} numberOfLines={2}>
                          {b.vehicle?.brand} {b.vehicle?.model}
                        </Text>
                        <View style={styles.recentFaultRow}>
                          <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.recentFault} numberOfLines={2}>
                          {b.fault?.name}
                        </Text>
                        </View>
                        <View style={[styles.statusChip, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusChipText, { color: badge.fg }]}>
                            {bookingStatusLabel(b.status)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                    </View>
                  </Card>
                </TouchableOpacity>
              </AnimatedFadeIn>
            )
          })}
        </>
      ) : (
        <Card style={styles.emptyRecent}>
          <Text style={styles.emptyRecentTitle}>No bookings yet</Text>
          <Text style={styles.emptyRecentText}>
            Request a mechanic from Find, or browse your garage and fault type to post an open job.
          </Text>
          <Button
            title="Find a mechanic"
            onPress={() => navigation.navigate('FindMechanics')}
            style={styles.emptyRecentBtn}
          />
        </Card>
      )}

      <View style={styles.nearbySection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Nearby mechanics</Text>
          {nearbyLoading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nearbyScroll}
        >
          {nearby.map((m: any, idx: number) => {
            const mechanic = m.mechanic
            const displayName =
              mechanic?.companyName || mechanic?.ownerFullName || mechanic?.email?.split('@')[0] || 'Workshop'
            const initial = displayName.trim().charAt(0).toUpperCase() || '?'
            const rating =
              typeof m.averageRating === 'number' && !Number.isNaN(m.averageRating)
                ? m.averageRating.toFixed(1)
                : '…'
            const dist =
              typeof m.distanceKm === 'number' ? `${m.distanceKm.toFixed(1)} km` : '…'
            return (
              <TouchableOpacity
                key={`nearby-${mechanic?.id ?? m.id ?? idx}`}
                style={styles.nearbyCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('FindMechanics')}
              >
                <View style={styles.nearbyAvatar}>
                  <Text style={styles.nearbyAvatarText}>{initial}</Text>
                </View>
                <Text style={styles.nearbyName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.nearbyMeta}>
                  <Ionicons name="star" size={12} color={colors.brand.primary} />
                  <Text style={styles.nearbyRating}>{rating}</Text>
                </View>
                <View style={styles.nearbyDistPill}>
                  <Text style={styles.nearbyDistText}>{dist}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <AnimatedFadeIn delay={180} duration={280}>
        <View style={[styles.actionSection, { paddingHorizontal: PAD }]}>
          <View style={styles.actionSectionHeader}>
            <Ionicons name="grid-outline" size={18} color={colors.brand.primary} />
            <Text style={styles.actionSectionTitle}>Quick actions</Text>
          </View>
          <View style={styles.actionRow}>
            <DashboardActionTile
              layout="column"
              showChevron={false}
              icon="checkmark-done-outline"
              title="Job history"
              subtitle="Completed jobs"
              iconColor={colors.brand.paid}
              iconBg={colors.brand.paidBg}
              onPress={() => navigation.getParent()?.navigate('JobHistory')}
            />
            <DashboardActionTile
              layout="column"
              showChevron={false}
              icon="wallet-outline"
              title="Wallet"
              subtitle="Balance & payments"
              iconColor={colors.primary[800]}
              iconBg={colors.primary[50]}
              onPress={() => navigation.getParent()?.navigate('UserWallet')}
            />
          </View>
        </View>
      </AnimatedFadeIn>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40, width: '100%', paddingTop: 0 },
  heroShell: {
    width: '100%',
    backgroundColor: colors.brand.forest,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.brand.forest,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  heroInner: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    position: 'relative',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    alignSelf: 'flex-start',
    maxWidth: '78%',
  },
  logoDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#f8fafc',
    letterSpacing: 0.35,
    flexShrink: 1,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand.highlight,
    borderWidth: 1.5,
    borderColor: colors.brand.forest,
  },
  greeting: { ...typography.title, color: '#f8fafc', letterSpacing: -0.5, marginBottom: 6 },
  greetingSub: {
    ...typography.body,
    color: 'rgba(248,250,252,0.55)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroStatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  statPillValue: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: '#f8fafc',
    marginBottom: 4,
  },
  statPillLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: 'rgba(248,250,252,0.6)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statPillLabelOnGreen: {
    color: 'rgba(255,255,255,0.85)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: PAD,
  },
  sectionTitle: {
    ...typography.section,
    fontSize: 16,
    color: colors.brand.forest,
    flex: 1,
  },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.brand.primary, letterSpacing: 0.3 },
  emptyRecent: {
    marginHorizontal: PAD,
    marginBottom: 16,
    padding: 20,
    borderRadius: layout.cardRadius,
  },
  emptyRecentTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  emptyRecentText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  emptyRecentBtn: { alignSelf: 'stretch' },
  recentCard: {
    marginBottom: TILE_GAP,
    marginHorizontal: PAD,
    borderRadius: layout.cardRadius,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  recentCardInner: { flexDirection: 'row', alignItems: 'center' },
  recentIcon: { width: 40, height: 40, borderRadius: 20 },
  recentContent: { flex: 1, marginLeft: 12, minWidth: 0, paddingRight: 4 },
  recentVehicle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  recentFaultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recentFault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, flex: 1, minWidth: 0 },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
  },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 0.15 },
  nearbySection: { marginBottom: 8, marginTop: 4 },
  nearbyScroll: { paddingLeft: PAD, paddingRight: PAD, paddingBottom: 4 },
  nearbyCard: {
    width: 148,
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nearbyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  nearbyAvatarText: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.brand.primary,
  },
  nearbyName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  nearbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  nearbyRating: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  nearbyDistPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
  },
  nearbyDistText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.brand.primary,
  },
  actionSection: { marginBottom: 16, alignSelf: 'stretch', marginTop: 8 },
  actionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  actionSectionTitle: { ...typography.section, color: colors.text, marginBottom: 0, fontSize: 16 },
  actionRow: {
    flexDirection: 'row',
    gap: TILE_GAP,
    alignSelf: 'stretch',
  },
})
