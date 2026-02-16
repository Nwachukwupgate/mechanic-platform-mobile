import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usersAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function ProfileScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [profile, setProfile] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    usersAPI.getProfile()
      .then((res) => {
        setProfile(res.data)
        setPhone(res.data?.profile?.phone || '')
        setAddress(res.data?.profile?.address || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await usersAPI.updateProfile({ phone, address })
    } catch (e: any) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingOverlay />

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={44} color={colors.primary[600]} />
          </View>
          <View style={styles.profileNames}>
            <Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>Contact</Text>
        <View style={styles.formBlock}>
          <Input label="Phone" value={phone} onChangeText={setPhone} />
          <Input label="Address" value={address} onChangeText={setAddress} style={styles.inputSpaced} />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Button title="Save changes" onPress={save} loading={saving} style={styles.saveBtn} />
        </View>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  profileCard: { padding: 20 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  profileNames: { marginLeft: 18 },
  name: { fontSize: 21, fontWeight: '700', color: colors.text },
  email: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 12,
  },
  formBlock: {},
  inputSpaced: { marginTop: 4 },
  err: { color: colors.accent.red, fontSize: 14, marginTop: 12, marginBottom: 4 },
  saveBtn: { marginTop: 18 },
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
  linkIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  logout: { marginTop: 28 },
})
