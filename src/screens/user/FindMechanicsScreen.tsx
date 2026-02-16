import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, faultsAPI, bookingsAPI, ratingsAPI, getApiErrorMessage } from '../../services/api'
import { reverseGeocode, type ReverseGeocodeResult } from '../../services/geocoding'
import { useCurrentLocation } from '../../utils/location'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { MechanicsMap, type MechanicMarker } from '../../components/MechanicsMap'

type MechanicResult = {
  mechanic?: {
    id: string
    companyName?: string
    ownerFullName?: string
    workshopLat?: number
    workshopLng?: number
    workshopAddress?: string
    avatarUrl?: string
    bio?: string
    expertise?: string[]
    verified?: boolean
  }
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
  const [addressDetails, setAddressDetails] = useState<ReverseGeocodeResult | null>(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [description, setDescription] = useState('')
  const [postingJob, setPostingJob] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})

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
      setAddressDetails(null)
      return
    }
    let cancelled = false
    setAddressLoading(true)
    reverseGeocode(locationState.lat, locationState.lng)
      .then((r) => {
        if (!cancelled) {
          setAddressDetails(r)
          const parts = [r.street, r.city, r.state].filter(Boolean)
          setAddressPreview(parts.length > 0 ? parts.join(', ') : r.fullAddress)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAddressDetails(null)
          setAddressPreview('Address could not be determined')
        }
      })
      .finally(() => {
        if (!cancelled) setAddressLoading(false)
      })
    return () => { cancelled = true }
  }, [locationState.lat, locationState.lng])

  const mechanicIds = mechanics.map((m) => m.mechanic?.id).filter(Boolean).join(',')
  useEffect(() => {
    if (!mechanicIds) return
    const ids = mechanicIds.split(',').filter(Boolean)
    ids.forEach((id) => {
      ratingsAPI.getMechanicAverage(id).then((r) => {
        const avg = r.data?.average
        if (typeof avg === 'number') setRatings((prev) => ({ ...prev, [id]: avg }))
      }).catch(() => {})
    })
  }, [mechanicIds])

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
        description: description.trim() || undefined,
      })
      navigation.getParent()?.navigate('BookingDetail', { id: res.data.id })
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setRequestingId(null)
    }
  }

  const postJobForQuotes = async () => {
    if (!selectedVehicle || !selectedFault) {
      Alert.alert('Required', 'Select vehicle and issue')
      return
    }
    if (locationState.lat == null || locationState.lng == null) {
      Alert.alert('Location required', 'Tap "Use my location" and allow access, then try again.')
      return
    }
    setPostingJob(true)
    try {
      const res = await bookingsAPI.create({
        vehicleId: selectedVehicle,
        faultId: selectedFault,
        locationLat: locationState.lat,
        locationLng: locationState.lng,
        description: description.trim() || undefined,
      })
      navigation.getParent()?.navigate('BookingDetail', { id: res.data.id })
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setPostingJob(false)
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
        <Card style={styles.formCard}>
          <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>Location</Text>
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

          <Text style={styles.sectionLabel}>Vehicle</Text>
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
          <Text style={styles.sectionLabel}>Additional details (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. when it started, sounds, warning lights..."
            placeholderTextColor={colors.neutral[400]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <View style={styles.actionRow}>
            <Button
              title="Search mechanics"
              onPress={search}
              loading={searching}
              disabled={locationState.lat == null || locationState.lng == null}
              style={styles.searchBtn}
            />
            <Button
              title="Post job & get quotes"
              onPress={postJobForQuotes}
              loading={postingJob}
              variant="outline"
              disabled={locationState.lat == null || locationState.lng == null}
              style={styles.postJobBtn}
            />
          </View>
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
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Nearby mechanics</Text>
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

            {viewMode === 'list' && mechanics.map((m: MechanicResult) => {
              const mid = m.mechanic?.id
              const rating = mid ? ratings[mid] : undefined
              return (
                <Card key={mid} style={styles.mechanicCard}>
                  <View style={styles.mechanicCardHeader}>
                    {m.mechanic?.avatarUrl ? (
                      <Image source={{ uri: m.mechanic.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={28} color={colors.neutral[500]} />
                      </View>
                    )}
                    <View style={styles.mechanicInfo}>
                      <View style={styles.mechanicNameRow}>
                        <Text style={styles.mechanicName}>{m.mechanic?.companyName || 'Garage'}</Text>
                        {m.mechanic?.verified ? (
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.accent.green} />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.mechanicOwner}>{m.mechanic?.ownerFullName}</Text>
                      {typeof rating === 'number' ? (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={16} color={colors.accent.amber} />
                          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {m.mechanic?.bio ? (
                    <Text style={styles.bio} numberOfLines={2}>{m.mechanic.bio}</Text>
                  ) : null}
                  {(m.mechanic?.expertise?.length ?? 0) > 0 ? (
                    <View style={styles.expertiseRow}>
                      {(m.mechanic!.expertise!).slice(0, 4).map((ex: string) => (
                        <View key={ex} style={styles.expertiseChip}>
                          <Text style={styles.expertiseChipText}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {m.workshopAddress || m.mechanic?.workshopAddress ? (
                    <Text style={styles.addr} numberOfLines={1}>{m.workshopAddress || m.mechanic?.workshopAddress}</Text>
                  ) : null}
                  <Button
                    title={requestingId === mid ? 'Requesting…' : 'Request service'}
                    onPress={() => mid && requestService(mid)}
                    loading={requestingId === mid}
                    style={styles.reqBtn}
                  />
                </Card>
              )
            })}
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
  scroll: { padding: 20, paddingBottom: 40 },
  formCard: { padding: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
    letterSpacing: 0.4,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionLabelFirst: { marginTop: 0 },
  locationBtn: { marginTop: 6 },
  hint: { fontSize: 14, color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  addressPreview: { fontSize: 14, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  errorText: { fontSize: 14, color: colors.accent.red, flex: 1 },
  dismissText: { fontSize: 14, color: colors.primary[600], fontWeight: '600' },
  chips: { marginTop: 10, marginHorizontal: -4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, backgroundColor: colors.neutral[100], marginRight: 10 },
  chipActive: { backgroundColor: colors.primary[600] },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: '#fff' },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 88,
    marginTop: 8,
    textAlignVertical: 'top',
  },
  actionRow: { gap: 14, marginTop: 22 },
  searchBtn: {},
  postJobBtn: {},
  loadingSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28 },
  loadingSectionText: { fontSize: 15, color: colors.textSecondary },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  resultsTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.neutral[100] },
  toggleBtnActive: { backgroundColor: colors.primary[600] },
  toggleText: { fontSize: 14, color: colors.text },
  toggleTextActive: { color: '#fff' },
  mapBlock: { marginBottom: 20 },
  mechanicCard: { marginBottom: 16, padding: 20 },
  mechanicTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarPlaceholder: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  mechanicInfo: { flex: 1, marginLeft: 16 },
  mechanicNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  mechanicName: { fontSize: 18, fontWeight: '700', color: colors.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontSize: 12, color: colors.accent.green, fontWeight: '600' },
  mechanicOwner: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { fontSize: 14, fontWeight: '600', color: colors.text },
  bio: { fontSize: 14, color: colors.textSecondary, marginTop: 14, lineHeight: 22 },
  expertiseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  expertiseChip: { backgroundColor: colors.primary[50], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  expertiseChipText: { fontSize: 12, color: colors.primary[700], fontWeight: '500' },
  addr: { fontSize: 13, color: colors.neutral[500], marginTop: 12 },
  reqBtn: { marginTop: 18 },
  emptySection: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  skeletonList: { marginTop: 12 },
  skeletonCard: { marginBottom: 14 },
  skeletonLine: { height: 14, borderRadius: 6, backgroundColor: colors.neutral[200] },
  skeletonButton: { height: 48, borderRadius: 12, backgroundColor: colors.neutral[200] },
})
