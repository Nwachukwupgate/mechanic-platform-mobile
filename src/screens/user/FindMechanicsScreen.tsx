import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, faultsAPI, bookingsAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function FindMechanicsScreen({ navigation }: { navigation: any }) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [faults, setFaults] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedFault, setSelectedFault] = useState('')
  const [mechanics, setMechanics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [requestingId, setRequestingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([vehiclesAPI.getAll(), faultsAPI.getAll()])
      .then(([v, f]) => {
        setVehicles(v.data || [])
        setFaults(f.data || [])
        if (v.data?.length) setSelectedVehicle(v.data[0].id)
        if (f.data?.length) setSelectedFault(f.data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const search = async () => {
    if (!selectedVehicle || !selectedFault) {
      Alert.alert('Required', 'Select vehicle and issue')
      return
    }
    setSearching(true)
    try {
      const fault = faults.find((f) => f.id === selectedFault)
      const res = await bookingsAPI.findNearbyMechanics(9.0765, 7.3986, fault?.category || 'MECHANICAL', 10, selectedVehicle)
      setMechanics(res.data || [])
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSearching(false)
    }
  }

  const requestService = async (mechanicId: string) => {
    setRequestingId(mechanicId)
    try {
      const res = await bookingsAPI.create({
        vehicleId: selectedVehicle,
        faultId: selectedFault,
        mechanicId,
        locationLat: 9.0765,
        locationLng: 7.3986,
      })
      navigation.navigate('BookingDetail', { id: res.data.id })
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setRequestingId(null)
    }
  }

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={styles.label}>Vehicle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicle(v.id)}
                style={[styles.chip, selectedVehicle === v.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedVehicle === v.id && styles.chipTextActive]}>{v.brand} {v.model}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.label, { marginTop: 12 }]}>Issue</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {faults.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedFault(f.id)}
                style={[styles.chip, selectedFault === f.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedFault === f.id && styles.chipTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button title="Search mechanics" onPress={search} loading={searching} style={styles.searchBtn} />
        </Card>
        {mechanics.length > 0 && (
          <Text style={styles.sectionTitle}>Nearby mechanics</Text>
        )}
        {mechanics.map((m: any) => (
          <Card key={m.mechanic?.id} style={styles.mechanicCard}>
            <Text style={styles.mechanicName}>{m.mechanic?.companyName || 'Garage'}</Text>
            <Text style={styles.mechanicOwner}>{m.mechanic?.ownerFullName}</Text>
            {m.workshopAddress ? <Text style={styles.addr} numberOfLines={1}>{m.workshopAddress}</Text> : null}
            <Button
              title={requestingId === m.mechanic?.id ? 'Requesting…' : 'Request service'}
              onPress={() => requestService(m.mechanic.id)}
              loading={requestingId === m.mechanic?.id}
              style={styles.reqBtn}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  chips: { marginTop: 8, marginHorizontal: -4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.neutral[100], marginRight: 8 },
  chipActive: { backgroundColor: colors.primary[600] },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: '#fff' },
  searchBtn: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 12 },
  mechanicCard: { marginBottom: 12 },
  mechanicName: { fontSize: 18, fontWeight: '600', color: colors.text },
  mechanicOwner: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addr: { fontSize: 12, color: colors.neutral[500], marginTop: 4 },
  reqBtn: { marginTop: 12 },
})
