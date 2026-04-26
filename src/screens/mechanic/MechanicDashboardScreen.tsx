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
import { bookingsAPI, notificationsAPI } from '../../services/api'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { fonts } from '../../theme/fonts'
import { Card } from '../../components/Card'
import { IconBadge } from '../../components/IconBadge'
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'
import { HeroDecorativeRings } from '../../components/HeroDecorativeRings'
import { getGreetingLine } from '../../utils/greeting'
import { bookingStatusBadgeColors, bookingStatusLabel } from '../../utils/bookingStatusBadge'
import { layout } from '../../theme/layout'
import { Button } from '../../components/Button'

const PAD = layout.screenPaddingHorizontal
const LIST_PREVIEW = 3

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

function SectionHeading({
  icon,
  iconBg,
  iconColor,
  title,
  showSeeAll,
  onSeeAll,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconBg: string
  iconColor: string
  title: string
  showSeeAll?: boolean
  onSeeAll?: () => void
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>
      {showSeeAll && onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function MechanicDashboardScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const justLoggedIn = useAuthStore((s) => s.justLoggedIn)
  const clearJustLoggedIn = useAuthStore((s) => s.clearJustLoggedIn)
  const name = user?.companyName || user?.ownerFullName || user?.email?.split('@')[0] || 'there'
  const [openRequests, setOpenRequests] = useState<any[]>([])
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadActivity, setUnreadActivity] = useState(0)
  useEffect(() => {
    if (justLoggedIn && name) {
      clearJustLoggedIn()
      Alert.alert('Welcome back!', `Great to see you, ${name}. Here’s your job overview.`, [{ text: 'Thanks' }])
    }
  }, [justLoggedIn, name, clearJustLoggedIn])

  const load = useCallback(async () => {
    try {
      const [openRes, allRes, unreadRes] = await Promise.all([
        bookingsAPI.getOpenRequests().catch(() => ({ data: [] })),
        bookingsAPI.getAll(),
        notificationsAPI.unreadCount().catch(() => ({ data: { count: 0 } })),
      ])
      setOpenRequests(Array.isArray(openRes.data) ? openRes.data : [])
      const all = allRes.data || []
      setMyBookings(all)
      const uc = (unreadRes as { data?: { count?: number } }).data?.count
      setUnreadActivity(typeof uc === 'number' ? uc : 0)
    } catch (_) {
      setUnreadActivity(0)
    }
    finally {
      setLoading(false)
      setRefreshing(false)
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

  const pending = myBookings.filter((b: any) => b.status === 'REQUESTED' && b.mechanicId)
  const active = myBookings.filter((b: any) => ACTIVE_STATUSES.includes(b.status))
  const completed = myBookings.filter((b: any) => COMPLETED_STATUSES.includes(b.status))
  const sortedBookings = [...myBookings].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
  const recentPreview = sortedBookings.slice(0, LIST_PREVIEW)

  const pendingPreview = pending.slice(0, LIST_PREVIEW)
  const openPreview = openRequests.slice(0, LIST_PREVIEW)

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    )
  }

  const heroPadTop = Math.max(insets.top, 10) + 8
  const chipLabel =
    (user?.companyName || '').trim().slice(0, 18) || (user?.ownerFullName || 'Workshop').split(' ')[0] || 'Workshop'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
      }
    >
      <View style={styles.heroShell}>
        <HeroDecorativeRings />
        <View style={[styles.heroInner, { paddingTop: heroPadTop }]}>
          <View style={styles.heroTop}>
            <View style={styles.logoChip}>
              <View style={styles.logoDot}>
                <Ionicons name="construct" size={12} color="#fff" />
              </View>
              <Text style={styles.logoChipText} numberOfLines={1}>
                {chipLabel}
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
            <Text style={styles.greetingSub}>Quote open jobs, chat with customers, get paid.</Text>
            <View style={styles.heroStatRow}>
              <View style={[styles.statPill, styles.statPillActive]}>
                <Text style={styles.statPillValue}>{openRequests.length}</Text>
                <Text style={[styles.statPillLabel, styles.statPillLabelOnGreen]}>Open</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{active.length}</Text>
                <Text style={styles.statPillLabel}>Active</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>{completed.length}</Text>
                <Text style={styles.statPillLabel}>Done</Text>
              </View>
            </View>
          </AnimatedFadeIn>
        </View>
      </View>

      {pendingPreview.length === 0 && openPreview.length === 0 && recentPreview.length === 0 && (
        <View style={styles.emptyDash}>
          <Text style={styles.emptyDashTitle}>Nothing on your board yet</Text>
          <Text style={styles.emptyDashText}>
            Open requests appear here for you to quote. Turn on availability so customers can find you.
          </Text>
          <Button
            title="Browse open requests"
            onPress={() => navigation.navigate('Bookings')}
            style={styles.emptyDashBtn}
          />
          <Button
            title="Turn on availability"
            variant="outline"
            onPress={() => navigation.navigate('Profile')}
            style={styles.emptyDashBtn}
          />
          <Button
            title="Complete your profile"
            variant="outline"
            onPress={() => navigation.navigate('Profile')}
            style={styles.emptyDashBtn}
          />
        </View>
      )}

      {pendingPreview.length > 0 && (
        <>
          <SectionHeading
            icon="paper-plane-outline"
            iconBg={colors.brand.requestedBg}
            iconColor={colors.brand.requestedFg}
            title="Sent to you: send a quote"
            showSeeAll={pending.length > LIST_PREVIEW}
            onSeeAll={() => navigation.navigate('Bookings')}
          />
          {pendingPreview.map((b: any) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
              activeOpacity={0.8}
            >
              <Card style={styles.bookingCard}>
                <View style={styles.bookingCardInner}>
                  <IconBadge
                    name="person"
                    size={20}
                    color={colors.brand.requestedFg}
                    backgroundColor={colors.brand.requestedBg}
                    style={styles.bookingIcon}
                  />
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
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.brand.primary} />
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

      {openPreview.length > 0 && (
        <>
          <SectionHeading
            icon="flash-outline"
            iconBg={colors.primary[100]}
            iconColor={colors.brand.primary}
            title="Open requests (quote to win)"
            showSeeAll={openRequests.length > LIST_PREVIEW}
            onSeeAll={() => navigation.navigate('Bookings')}
          />
          {openPreview.map((b: any) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
              activeOpacity={0.8}
            >
              <Card style={styles.bookingCard}>
                <View style={styles.bookingCardInner}>
                  <IconBadge
                    name="car-sport"
                    size={20}
                    color={colors.brand.primary}
                    backgroundColor={colors.primary[50]}
                    style={styles.bookingIcon}
                  />
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
                      <Ionicons name="pricetag-outline" size={14} color={colors.brand.primary} />
                      <Text style={styles.openLabel}>No quote yet</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      {recentPreview.length > 0 && (
        <>
          <SectionHeading
            icon="reader-outline"
            iconBg={colors.neutral[100]}
            iconColor={colors.neutral[600]}
            title="Recent bookings"
            showSeeAll={sortedBookings.length > LIST_PREVIEW}
            onSeeAll={() => navigation.navigate('Bookings')}
          />
          {recentPreview.map((b: any) => {
            const badge = bookingStatusBadgeColors(b.status)
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => navigation.navigate('MechanicBookingDetail', { id: b.id })}
                activeOpacity={0.8}
              >
                <Card style={styles.bookingCard}>
                  <View style={styles.bookingCardInner}>
                    <IconBadge
                      name="car-sport"
                      size={20}
                      color={colors.brand.primary}
                      backgroundColor={colors.primary[100]}
                      style={styles.bookingIcon}
                    />
                    <View style={styles.bookingContent}>
                      <Text style={styles.vehicle} numberOfLines={2}>
                        {b.vehicle?.brand} {b.vehicle?.model}
                      </Text>
                      <View style={styles.faultRow}>
                        <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.fault} numberOfLines={2}>
                          {b.fault?.name}
                        </Text>
                      </View>
                      {b.estimatedCost != null && (
                        <View style={styles.costRow}>
                          <Ionicons name="cash-outline" size={14} color={colors.brand.primary} />
                          <Text style={styles.cost}>₦{Number(b.estimatedCost).toLocaleString()}</Text>
                        </View>
                      )}
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
            )
          })}
        </>
      )}
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
  scroll: { paddingBottom: 40, width: '100%' },
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
  emptyDash: {
    paddingHorizontal: PAD,
    marginBottom: 24,
    marginTop: 4,
  },
  emptyDashTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.brand.forest,
    marginBottom: 8,
  },
  emptyDashText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  emptyDashBtn: { marginBottom: 10, alignSelf: 'stretch' },
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
    marginTop: 4,
    paddingHorizontal: PAD,
    gap: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.section,
    fontSize: 16,
    letterSpacing: -0.35,
    color: colors.brand.forest,
    flex: 1,
    marginBottom: 0,
  },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.brand.primary, letterSpacing: 0.3 },
  bookingCard: {
    marginBottom: 12,
    marginHorizontal: PAD,
    borderRadius: layout.cardRadius,
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
  vehicle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  faultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, flex: 1, minWidth: 0 },
  openLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  openLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.brand.primary },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
  },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 0.15 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cost: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
})
