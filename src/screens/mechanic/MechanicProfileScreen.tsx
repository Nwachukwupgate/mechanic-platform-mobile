import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { mechanicsAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function MechanicProfileScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    mechanicsAPI.getProfile()
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleAvailability = async () => {
    const next = !profile?.availability
    setToggling(true)
    try {
      await mechanicsAPI.updateAvailability(next)
      setProfile((p: any) => (p ? { ...p, availability: next } : p))
    } catch (e: any) {
      alert(getApiErrorMessage(e))
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <LoadingOverlay />

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.name}>{profile?.companyName || user?.companyName}</Text>
        <Text style={styles.email}>{profile?.ownerFullName || user?.email}</Text>
        <View style={styles.availRow}>
          <Text style={styles.availLabel}>Availability</Text>
          <Button
            title={profile?.availability ? 'Available' : 'Unavailable'}
            onPress={toggleAvailability}
            loading={toggling}
            variant={profile?.availability ? 'primary' : 'secondary'}
            style={styles.availBtn}
          />
        </View>
      </Card>
      <Button title="Sign out" onPress={() => logout()} variant="outline" style={styles.logout} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  availLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  availBtn: { minWidth: 120 },
  logout: { marginTop: 24 },
})
