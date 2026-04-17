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
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'
import { DashboardActionTile, useDashboardTileWidth } from '../../components/DashboardActionTile'
import { getGreetingLine } from '../../utils/greeting'

const PAD = 16
const TILE_GAP = 10

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
const COMPLETED_STATUSES = ['DONE', 'PAID', 'DELIVERED']

export function DashboardScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((s) => s.user)
  const justLoggedIn = useAuthStore((s) => s.justLoggedIn)
  const clearJustLoggedIn = useAuthStore((s) => s.clearJustLoggedIn)
  const name = user?.firstName || user?.email?.split('@')[0] || 'there'
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { width: screenW } = useWindowDimensions()
  const tileW = useDashboardTileWidth(PAD, TILE_GAP, screenW)

  useEffect(() => {
    if (justLoggedIn && name) {
      clearJustLoggedIn()
      Alert.alert('Welcome back!', `Great to see you, ${name}. Here’s your booking overview.`, [{ text: 'Thanks' }])
    }
  }, [justLoggedIn, name, clearJustLoggedIn])

  const load = useCallback(async () => {
    try {
      const res = await bookingsAPI.getAll()
      setBookings(Array.isArray(res.data) ? res.data : [])
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

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
      <LinearGradient colors={[...gradients.heroRich]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <AnimatedFadeIn>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary[700]} />
            <Text style={styles.heroBadgeText}>Your garage, in your pocket</Text>
          </View>
          <Text style={styles.greeting}>{getGreetingLine(name)}</Text>
          <Text style={styles.greetingSub}>Track quotes, chat, and payments in one place.</Text>
        </AnimatedFadeIn>
      </LinearGradient>

      <View style={styles.statsRow}>
        <AnimatedFadeIn delay={0} duration={280}>
          <View style={[styles.statBox, { borderTopColor: colors.primary[500] }]}>
            <IconBadge name="time" color={colors.primary[600]} backgroundColor={colors.primary[100]} />
            <Text style={styles.statValue}>{active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={60} duration={280}>
          <View style={[styles.statBox, { borderTopColor: colors.accent.violet }]}>
            <IconBadge name="document-text" color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} />
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={120} duration={280}>
          <View style={[styles.statBox, { borderTopColor: colors.accent.green }]}>
            <IconBadge name="checkmark-done" color={colors.accent.green} backgroundColor={colors.accent.green + '22'} />
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </AnimatedFadeIn>
      </View>

      {recent.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent bookings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recent.map((b, i) => (
            <AnimatedFadeIn key={b.id} delay={180 + i * 50} duration={260}>
              <TouchableOpacity
                onPress={() => navigation.getParent()?.navigate('BookingDetail', { id: b.id })}
                activeOpacity={0.8}
              >
                <Card style={styles.recentCard}>
                <View style={styles.recentCardInner}>
                  <IconBadge name="car-sport" size={20} color={colors.primary[600]} backgroundColor={colors.primary[50]} style={styles.recentIcon} />
                  <View style={styles.recentContent}>
                    <Text style={styles.recentVehicle} numberOfLines={1}>
                      {b.vehicle?.brand} {b.vehicle?.model}
                    </Text>
                    <View style={styles.recentFaultRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.recentFault} numberOfLines={1}>
                        {b.fault?.name}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                      <Text style={styles.statusChipText}>{b.status?.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
            </AnimatedFadeIn>
          ))}
        </>
      )}

      <AnimatedFadeIn delay={220} duration={300}>
        <View style={[styles.actionSection, { paddingHorizontal: PAD }]}>
          <View style={styles.actionSectionHeader}>
            <Ionicons name="grid-outline" size={18} color={colors.primary[600]} />
            <Text style={styles.actionSectionTitle}>Quick actions</Text>
          </View>
          <View style={styles.actionRow}>
            <DashboardActionTile
              width={tileW}
              icon="search"
              title="Find mechanics"
              subtitle="Nearby workshops & quotes"
              iconColor={colors.primary[700]}
              iconBg={colors.primary[100]}
              onPress={() => navigation.navigate('FindMechanics')}
            />
            <DashboardActionTile
              width={tileW}
              icon="calendar-outline"
              title="My bookings"
              subtitle="Chat, pay, track status"
              iconColor={colors.accent.violet}
              iconBg={colors.accent.violet + '22'}
              onPress={() => navigation.navigate('Bookings')}
            />
          </View>
          <View style={styles.actionRow}>
            <DashboardActionTile
              width={tileW}
              icon="checkmark-done-outline"
              title="Job history"
              subtitle="Completed jobs"
              iconColor={colors.accent.green}
              iconBg={colors.accent.green + '22'}
              onPress={() => navigation.getParent()?.navigate('JobHistory')}
            />
            <DashboardActionTile
              width={tileW}
              icon="wallet-outline"
              title="Wallet"
              subtitle="Balance & payments"
              iconColor={colors.primary[700]}
              iconBg={colors.primary[50]}
              onPress={() => navigation.getParent()?.navigate('UserWallet')}
            />
          </View>
        </View>
      </AnimatedFadeIn>
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
    overflow: 'hidden',
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
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, marginTop: 6 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: PAD },
  sectionTitle: { ...typography.section, color: colors.text },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary[600] },
  recentCard: { marginBottom: TILE_GAP, marginHorizontal: PAD },
  recentCardInner: { flexDirection: 'row', alignItems: 'center' },
  recentIcon: { width: 40, height: 40, borderRadius: 20 },
  recentContent: { flex: 1, marginLeft: 12, minWidth: 0 },
  recentVehicle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  recentFaultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recentFault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text },
  actionSection: { marginBottom: 8 },
  actionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  actionSectionTitle: { ...typography.section, color: colors.text, marginBottom: 0 },
  actionRow: {
    flexDirection: 'row',
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
    justifyContent: 'flex-start',
  },
})
