import React, { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'
import { getGreetingLine } from '../../utils/greeting'

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
            </AnimatedFadeIn>
          ))}
        </>
      )}

      <AnimatedFadeIn delay={220} duration={300}>
        <LinearGradient
          colors={[colors.surface, colors.primary[50]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featureShell}
        >
          <Card style={styles.cardInner}>
            <View style={styles.cardIconWrap}>
              <IconBadge name="car-sport" size={28} color={colors.primary[600]} backgroundColor={colors.primary[100]} style={styles.cardIconBadge} />
            </View>
            <Text style={styles.cardTitle}>Find a mechanic</Text>
            <Text style={styles.cardSub}>Search nearby verified workshops or post a job and compare quotes.</Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => navigation.navigate('FindMechanics')} activeOpacity={0.8}>
              <Text style={styles.cardBtnText}>Find mechanics</Text>
              <View style={styles.cardBtnIcon}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </Card>
        </LinearGradient>
      </AnimatedFadeIn>
      <AnimatedFadeIn delay={280} duration={300}>
        <LinearGradient
          colors={[colors.surface, colors.accent[50]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featureShell}
        >
          <Card style={styles.cardInner}>
            <View style={styles.cardIconWrap}>
              <IconBadge name="list" size={28} color={colors.accent.violet} backgroundColor={colors.accent.violet + '22'} style={styles.cardIconBadge} />
            </View>
            <Text style={styles.cardTitle}>My bookings</Text>
            <Text style={styles.cardSub}>Open a job to chat, pay, and rate when you’re done.</Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => navigation.navigate('Bookings')} activeOpacity={0.8}>
              <Text style={styles.cardBtnText}>View bookings</Text>
              <View style={styles.cardBtnIcon}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </Card>
        </LinearGradient>
      </AnimatedFadeIn>
      <AnimatedFadeIn delay={340}>
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
    marginHorizontal: 16,
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, paddingHorizontal: 16 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginTop: 8 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 },
  sectionTitle: { ...typography.section, color: colors.text },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary[600] },
  recentCard: { marginBottom: 10, marginHorizontal: 16 },
  recentCardInner: { flexDirection: 'row', alignItems: 'center' },
  recentIcon: { width: 40, height: 40, borderRadius: 20 },
  recentContent: { flex: 1, marginLeft: 14 },
  recentVehicle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  recentFaultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recentFault: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text },
  featureShell: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 2,
    overflow: 'hidden',
  },
  cardInner: { marginBottom: 0, borderWidth: 0, shadowOpacity: 0, elevation: 0 },
  cardIconWrap: { marginBottom: 4 },
  cardIconBadge: { width: 48, height: 48, borderRadius: 24 },
  cardTitle: { ...typography.section, color: colors.text, marginTop: 8 },
  cardSub: { ...typography.caption, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  cardBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#fff' },
  cardBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinks: { flexDirection: 'row', gap: 12, marginTop: 8, paddingHorizontal: 16 },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickLinkIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.primary[600] },
})
