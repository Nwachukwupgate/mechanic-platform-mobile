import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'

export function DashboardScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((s) => s.user)
  const name = user?.firstName || user?.email?.split('@')[0] || 'User'

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, {name}</Text>
      <Card style={styles.card}>
        <Ionicons name="car-sport" size={40} color={colors.primary[600]} />
        <Text style={styles.cardTitle}>Find a mechanic</Text>
        <Text style={styles.cardSub}>Select your vehicle and issue, then search for nearby verified mechanics.</Text>
        <View style={styles.cardBtn}>
          <Text style={styles.cardBtnText} onPress={() => navigation.navigate('FindMechanics')}>Find mechanics →</Text>
        </View>
      </Card>
      <Card style={styles.card}>
        <Ionicons name="list" size={40} color={colors.accent.violet} />
        <Text style={styles.cardTitle}>My bookings</Text>
        <Text style={styles.cardSub}>View and manage your service requests.</Text>
        <View style={styles.cardBtn}>
          <Text style={styles.cardBtnText} onPress={() => navigation.navigate('Bookings')}>View bookings →</Text>
        </View>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 },
  cardSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  cardBtn: { marginTop: 12 },
  cardBtnText: { fontSize: 16, color: colors.primary[600], fontWeight: '600' },
})
