import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, faultsAPI, bookingsAPI, getApiErrorMessage } from '../../services/api'
import { reverseGeocode } from '../../services/geocoding'
import { useCurrentLocation } from '../../utils/location'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { MechanicsMap, type MechanicMarker } from '../../components/MechanicsMap'

type MechanicResult = {
  mechanic?: { id: string; companyName?: string; ownerFullName?: string; workshopLat?: number; workshopLng?: number }
  workshopAddress?: string
  workshopLat?: number
  workshopLng?: number
}

export function FindMechanicsScreen({ navigation }: { navigation: any }) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [faults, setFaults] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedFault, setSelectedFault] = useState('')
  const [mechanics, setMechanics] = useState<MechanicResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [addressPreview, setAddressPreview] = useState<string | null>(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const {
    locationState,
    locationLoading,
    getLocation,
    clearError,
  } = useCurrentLocation()

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

  useEffect(() => {
    if (locationState.lat == null || locationState.lng == null) {
      setAddressPreview(null)
      return
    }
    let cancelled = false
    setAddressLoading(true)
    reverseGeocode(locationState.lat, locationState.lng)
      .then((r) => {
        if (!cancelled) setAddressPreview(r.fullAddress || `${locationState.lat?.toFixed(4)}, ${locationState.lng?.toFixed(4)}`)
      })
      .catch(() => {
        if (!cancelled) setAddressPreview(`${locationState.lat?.toFixed(4)}, ${locationState.lng?.toFixed(4)}`)
      })
      .finally(() => {
        if (!cancelled) setAddressLoading(false)
      })
    return () => { cancelled = true }
  }, [locationState.lat, locationState.lng])

  const search = async () => {
    if (!selectedVehicle || !selectedFault) {
      Alert.alert('Required', 'Select vehicle and issue')
      return
    }
    if (locationState.lat == null || locationState.lng == null) {
      Alert.alert('Location required', 'Tap "Use my location" and allow access, then try again.')
      return
    }
    setSearching(true)
    try {
      const fault = faults.find((f) => f.id === selectedFault)
      const res = await bookingsAPI.findNearbyMechanics(
        locationState.lat,
        locationState.lng,
        fault?.category || 'MECHANICAL',
        10,
        selectedVehicle
      )
      setMechanics(res.data || [])
      setHasSearched(true)
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSearching(false)
    }
  }

  const requestService = async (mechanicId: string) => {
    if (locationState.lat == null || locationState.lng == null) return
    setRequestingId(mechanicId)
    try {
      const res = await bookingsAPI.create({
        vehicleId: selectedVehicle,
        faultId: selectedFault,
        mechanicId,
        locationLat: locationState.lat,
        locationLng: locationState.lng,
      })
      navigation.navigate('BookingDetail', { id: res.data.id })
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setRequestingId(null)
    }
  }

  const mechanicMarkers: MechanicMarker[] = mechanics
    .filter((m) => {
      const lat = m.workshopLat ?? m.mechanic?.workshopLat
      const lng = m.workshopLng ?? m.mechanic?.workshopLng
      return typeof lat === 'number' && typeof lng === 'number'
    })
    .map((m) => {
      const lat = m.workshopLat ?? m.mechanic?.workshopLat ?? 0
      const lng = m.workshopLng ?? m.mechanic?.workshopLng ?? 0
      return {
        id: m.mechanic?.id ?? '',
        latitude: lat,
        longitude: lng,
        title: m.mechanic?.companyName || 'Garage',
      }
    })

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={styles.label}>Location</Text>
          <Button
            title={locationLoading ? 'Getting location…' : 'Use my location'}
            onPress={getLocation}
            loading={locationLoading}
            variant="outline"
            style={styles.locationBtn}
          />
          {locationState.error && (
            <View style={styles.errorRow}>
              <Ionicons name="warning-outline" size={18} color={colors.accent.red} />
              <Text style={styles.errorText}>{locationState.error}</Text>
              <TouchableOpacity onPress={clearError} hitSlop={8}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
          {addressLoading && locationState.lat != null && (
            <View style={styles.addressRow}>
              <ActivityIndicator size="small" color={colors.primary[600]} />
              <Text style={styles.addressPreview}>Looking up address…</Text>
            </View>
          )}
          {!addressLoading && addressPreview && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary[600]} />
              <Text style={styles.addressPreview} numberOfLines={2}>{addressPreview}</Text>
            </View>
          )}
          {!locationState.error && locationState.lat == null && !locationLoading && (
            <Text style={styles.hint}>Set your location to search for nearby mechanics.</Text>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Vehicle</Text>
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
          <Button
            title="Search mechanics"
            onPress={search}
            loading={searching}
            disabled={locationState.lat == null || locationState.lng == null}
            style={styles.searchBtn}
          />
        </Card>

        {searching && (
          <>
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={colors.primary[600]} />
              <Text style={styles.loadingSectionText}>Finding nearby mechanics…</Text>
            </View>
            <View style={styles.skeletonList}>
              {[1, 2, 3].map((i) => (
                <Card key={i} style={styles.skeletonCard}>
                  <View style={[styles.skeletonLine, { width: '70%' }]} />
                  <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
                  <View style={[styles.skeletonLine, { width: '85%', marginTop: 8 }]} />
                  <View style={[styles.skeletonButton, { marginTop: 12 }]} />
                </Card>
              ))}
            </View>
          </>
        )}

        {!searching && mechanics.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby mechanics</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => setViewMode('list')}
                  style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                >
                  <Ionicons name="list" size={18} color={viewMode === 'list' ? '#fff' : colors.text} />
                  <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('map')}
                  style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                >
                  <Ionicons name="map" size={18} color={viewMode === 'map' ? '#fff' : colors.text} />
                  <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
                </TouchableOpacity>
              </View>
            </View>

            {viewMode === 'map' && locationState.lat != null && locationState.lng != null && (
              <MechanicsMap
                userLat={locationState.lat}
                userLng={locationState.lng}
                mechanics={mechanicMarkers}
                style={styles.mapBlock}
              />
            )}

            {viewMode === 'list' && mechanics.map((m: MechanicResult) => (
              <Card key={m.mechanic?.id} style={styles.mechanicCard}>
                <Text style={styles.mechanicName}>{m.mechanic?.companyName || 'Garage'}</Text>
                <Text style={styles.mechanicOwner}>{m.mechanic?.ownerFullName}</Text>
                {m.workshopAddress ? <Text style={styles.addr} numberOfLines={1}>{m.workshopAddress}</Text> : null}
                <Button
                  title={requestingId === m.mechanic?.id ? 'Requesting…' : 'Request service'}
                  onPress={() => requestService(m.mechanic!.id)}
                  loading={requestingId === m.mechanic?.id}
                  style={styles.reqBtn}
                />
              </Card>
            ))}
          </>
        )}

        {!searching && mechanics.length === 0 && (
          <View style={styles.emptySection}>
            <Ionicons name="construct-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyTitle}>{hasSearched ? 'No mechanics found' : 'No mechanics yet'}</Text>
            <Text style={styles.emptyText}>
              {hasSearched
                ? 'No nearby mechanics found. Try a larger area or different issue.'
                : 'Set your location and tap "Search mechanics" to find nearby garages.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  locationBtn: { marginTop: 8 },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  addressPreview: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  errorText: { fontSize: 13, color: colors.accent.red, flex: 1 },
  dismissText: { fontSize: 13, color: colors.primary[600], fontWeight: '600' },
  chips: { marginTop: 8, marginHorizontal: -4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.neutral[100], marginRight: 8 },
  chipActive: { backgroundColor: colors.primary[600] },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: '#fff' },
  searchBtn: { marginTop: 16 },
  loadingSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  loadingSectionText: { fontSize: 14, color: colors.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  toggleRow: { flexDirection: 'row', gap: 4 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.neutral[100] },
  toggleBtnActive: { backgroundColor: colors.primary[600] },
  toggleText: { fontSize: 14, color: colors.text },
  toggleTextActive: { color: '#fff' },
  mapBlock: { marginBottom: 16 },
  mechanicCard: { marginBottom: 12 },
  mechanicName: { fontSize: 18, fontWeight: '600', color: colors.text },
  mechanicOwner: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addr: { fontSize: 12, color: colors.neutral[500], marginTop: 4 },
  reqBtn: { marginTop: 12 },
  emptySection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  skeletonList: { marginTop: 8 },
  skeletonCard: { marginBottom: 12 },
  skeletonLine: { height: 14, borderRadius: 6, backgroundColor: colors.neutral[200] },
  skeletonButton: { height: 48, borderRadius: 12, backgroundColor: colors.neutral[200] },
})
