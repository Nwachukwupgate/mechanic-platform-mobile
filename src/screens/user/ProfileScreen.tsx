import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
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
      <Card>
        <Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <Input label="Phone" value={phone} onChangeText={setPhone} />
        <Input label="Address" value={address} onChangeText={setAddress} />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button title="Save changes" onPress={save} loading={saving} />
      </Card>
      <Button title="Sign out" onPress={() => logout()} variant="outline" style={styles.logout} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  err: { color: colors.accent.red, fontSize: 14, marginBottom: 12 },
  links: { flexDirection: 'row', gap: 24, marginTop: 16 },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  logout: { marginTop: 24 },
})
