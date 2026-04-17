import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { usersAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { gradients } from '../../theme/gradients'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { DeleteAccountSheet } from '../../components/DeleteAccountSheet'
import { CollapsibleProfileSection } from '../../components/CollapsibleProfileSection'

function formatSavedAt(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return d.toLocaleDateString()
}

function UserProfileSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.skBar, { width: '100%', height: 120, borderRadius: 20 }]} />
      <Card style={styles.profileCard}>
        <View style={[styles.skBar, { width: '70%' }]} />
        <View style={[styles.skBar, { width: '90%' }]} />
        <View style={[styles.skBar, { width: '85%' }]} />
      </Card>
    </ScrollView>
  )
}

export function ProfileScreen({ navigation }: { navigation: any }) {
  const logout = useAuthStore((s) => s.logout)
  const [profile, setProfile] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [sectionOpen, setSectionOpen] = useState({ account: true, contact: true })

  const apply = useCallback((data: any) => {
    setProfile(data)
    setPhone(data?.profile?.phone || '')
    setAddress(data?.profile?.address || '')
  }, [])

  useEffect(() => {
    usersAPI
      .getProfile()
      .then((res) => apply(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apply])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await usersAPI.getProfile()
      apply(res.data)
    } catch {
      /* keep */
    } finally {
      setRefreshing(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await usersAPI.updateProfile({ phone, address })
      const res = await usersAPI.getProfile()
      apply(res.data)
      setLastSavedAt(new Date())
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 2600)
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {
        /* no-op */
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async (payload: { reasons: string[]; otherReason?: string }) => {
    setDeleting(true)
    try {
      await usersAPI.deleteAccount(payload)
      setDeleteSheetOpen(false)
      logout()
    } catch (e: any) {
      Alert.alert('Could not delete account', getApiErrorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const stats = profile?.stats as { totalBookings?: number; completedBookings?: number } | undefined

  if (loading && !profile) return <UserProfileSkeleton />

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
      }
    >
      {saveToast ? (
        <View style={styles.saveToast}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary[700]} />
          <Text style={styles.saveToastText}>Profile saved</Text>
        </View>
      ) : null}

      <LinearGradient colors={[...gradients.heroRich]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Ionicons name="person" size={40} color={colors.primary[600]} />
        </View>
        <Text style={styles.heroName}>
          {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Your profile'}
        </Text>
        <Text style={styles.heroEmail}>{profile?.email || '—'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statVal}>{stats?.totalBookings != null ? String(stats.totalBookings) : '—'}</Text>
            <Text style={styles.statLbl}>Bookings</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={styles.statVal}>{stats?.completedBookings != null ? String(stats.completedBookings) : '—'}</Text>
            <Text style={styles.statLbl}>Completed</Text>
          </View>
        </View>
      </LinearGradient>

      <Card style={styles.profileCard}>
        <CollapsibleProfileSection
          title="Account details"
          icon="id-card-outline"
          expanded={sectionOpen.account}
          onToggle={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            } catch {
              /* no-op */
            }
            setSectionOpen((s) => ({ ...s, account: !s.account }))
          }}
        >
          <View style={styles.readOnlyBlock}>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>First name</Text>
              <Text style={styles.readOnlyValue}>{profile?.firstName || '—'}</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Last name</Text>
              <Text style={styles.readOnlyValue}>{profile?.lastName || '—'}</Text>
            </View>
            <View style={[styles.readOnlyRow, styles.readOnlyRowLast]}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{profile?.email || '—'}</Text>
            </View>
          </View>
        </CollapsibleProfileSection>

        <CollapsibleProfileSection
          title="Contact"
          icon="call-outline"
          expanded={sectionOpen.contact}
          onToggle={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            } catch {
              /* no-op */
            }
            setSectionOpen((s) => ({ ...s, contact: !s.contact }))
          }}
        >
          <Input label="Phone" value={phone} onChangeText={setPhone} />
          <Input label="Address" value={address} onChangeText={setAddress} style={styles.inputSpaced} />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Button title="Save changes" onPress={save} loading={saving} style={styles.saveBtn} />
          <Text style={styles.savedMeta}>
            {lastSavedAt ? `Last saved ${formatSavedAt(lastSavedAt)}` : 'Update phone or address any time.'}
          </Text>
        </CollapsibleProfileSection>
      </Card>

      <Text style={styles.linksSectionTitle}>Quick links</Text>
      <View style={styles.links}>
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation?.getParent()?.navigate('UserWallet')}>
          <View style={styles.linkIconWrap}>
            <Ionicons name="wallet" size={22} color={colors.primary[600]} />
          </View>
          <Text style={styles.linkText}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation?.getParent()?.navigate('JobHistory')}>
          <View style={styles.linkIconWrap}>
            <Ionicons name="checkmark-done" size={22} color={colors.primary[600]} />
          </View>
          <Text style={styles.linkText}>Job history</Text>
        </TouchableOpacity>
      </View>
      <Button title="Sign out" onPress={() => logout()} variant="outline" style={styles.logout} />

      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Account</Text>
        <TouchableOpacity
          style={styles.deleteLink}
          onPress={() => setDeleteSheetOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={colors.accent.red} />
          <Text style={[styles.deleteLinkText, { marginLeft: 10 }]}>Delete account</Text>
        </TouchableOpacity>
      </View>

      <DeleteAccountSheet
        visible={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        onConfirm={handleDeleteAccount}
        loading={deleting}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  skBar: {
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    marginBottom: 12,
  },
  hero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  heroName: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  statCell: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, height: 28, backgroundColor: colors.neutral[200] },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase' },
  saveToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  saveToastText: { fontSize: 15, fontWeight: '700', color: colors.primary[800] },
  profileCard: { padding: 16 },
  readOnlyBlock: { backgroundColor: colors.neutral[50], borderRadius: 12, padding: 14, marginBottom: 8 },
  readOnlyRow: { marginBottom: 12 },
  readOnlyRowLast: { marginBottom: 0 },
  readOnlyLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  readOnlyValue: { fontSize: 15, color: colors.text },
  inputSpaced: { marginTop: 4 },
  err: { color: colors.accent.red, fontSize: 14, marginTop: 12, marginBottom: 4 },
  saveBtn: { marginTop: 18 },
  savedMeta: { fontSize: 12, color: colors.neutral[500], marginTop: 10, textAlign: 'center' },
  linksSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 28,
    marginBottom: 12,
  },
  links: { flexDirection: 'row', gap: 14, marginTop: 4 },
  linkCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  linkIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  logout: { marginTop: 28 },
  dangerZone: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  dangerZoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[500],
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteLinkText: { fontSize: 16, fontWeight: '600', color: colors.accent.red },
})
