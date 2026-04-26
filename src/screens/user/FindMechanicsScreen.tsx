import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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
  Switch,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, faultsAPI, bookingsAPI, ratingsAPI, getApiErrorMessage } from '../../services/api'
import { reverseGeocode, searchAddress, type ReverseGeocodeResult, type GeocodeSearchResult } from '../../services/geocoding'
import { useCurrentLocation } from '../../utils/location'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { MechanicsMap, type MechanicMarker } from '../../components/MechanicsMap'

const MAX_JOB_PHOTOS = 3
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

type LocalJobPhoto = { uri: string; name: string; type: string }

type MechanicResult = {
  distanceKm?: number
  averageRating?: number | null
  jobsCompleted?: number
  typicalResponseHours?: number | null
  nextAvailableNote?: string | null
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
    isVerified?: boolean
  }
  workshopAddress?: string
  workshopLat?: number
  workshopLng?: number
}

export function FindMechanicsScreen({ navigation }: { navigation: any }) {
  const catalogLoadedOnce = useRef(false)
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
    setManualLocation,
    clearError,
  } = useCurrentLocation()
  const [minRating, setMinRating] = useState<number | null>(null)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [jobPhotos, setJobPhotos] = useState<LocalJobPhoto[]>([])
  const [addressQuery, setAddressQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeSearchResult[]>([])
  const [addressLookupLoading, setAddressLookupLoading] = useState(false)

  const loadVehicleAndFaults = useCallback(async () => {
    const showSpinner = !catalogLoadedOnce.current
    if (showSpinner) setLoading(true)
    try {
      const [v, f] = await Promise.all([vehiclesAPI.getAll(), faultsAPI.getAll()])
      const vList = v.data || []
      const fList = f.data || []
      setVehicles(vList)
      setFaults(fList)
      setSelectedVehicle((prev) =>
        vList.some((x: any) => x.id === prev) ? prev : vList[0]?.id ?? ''
      )
      setSelectedFault((prev) =>
        fList.some((x: any) => x.id === prev) ? prev : fList[0]?.id ?? ''
      )
      catalogLoadedOnce.current = true
    } catch (_) {}
    finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadVehicleAndFaults()
    }, [loadVehicleAndFaults])
  )

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

  const lookupAddress = async () => {
    const q = addressQuery.trim()
    if (q.length < 3) {
      Alert.alert('Address', 'Enter at least 3 characters (e.g. city or street).')
      return
    }
    setAddressLookupLoading(true)
    setAddressSuggestions([])
    try {
      const results = await searchAddress(q)
      if (results.length === 0) {
        Alert.alert('No results', 'Try a nearby city or landmark.')
        return
      }
      setAddressSuggestions(results)
      if (results.length === 1) {
        const r = results[0]
        setManualLocation(r.lat, r.lng)
        setAddressPreview(r.label)
        setAddressSuggestions([])
      }
    } catch (e: any) {
      Alert.alert('Lookup failed', getApiErrorMessage(e, 'Check your connection and API key.'))
    } finally {
      setAddressLookupLoading(false)
    }
  }

  const selectAddressSuggestion = (r: GeocodeSearchResult) => {
    setAddressSuggestions([])
    setAddressQuery(r.label)
    setManualLocation(r.lat, r.lng)
    setAddressPreview(r.label)
  }

  const pickJobPhotos = async () => {
    const room = MAX_JOB_PHOTOS - jobPhotos.length
    if (room <= 0) {
      Alert.alert('Limit', `You can add up to ${MAX_JOB_PHOTOS} photos`)
      return
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach images.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.85,
    })
    if (result.canceled) return
    const next: LocalJobPhoto[] = []
    for (const a of result.assets || []) {
      const type = a.mimeType || 'image/jpeg'
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
        Alert.alert('Invalid type', 'Use JPEG, PNG, or WebP images.')
        return
      }
      if (a.fileSize != null && a.fileSize > MAX_PHOTO_BYTES) {
        Alert.alert('Too large', 'Each photo must be under 5MB')
        return
      }
      next.push({
        uri: a.uri,
        name: a.fileName || 'photo.jpg',
        type,
      })
    }
    setJobPhotos((prev) => [...prev, ...next].slice(0, MAX_JOB_PHOTOS))
  }

  const removeJobPhotoAt = (index: number) => {
    setJobPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadJobPhotosForBooking = async (bookingId: string) => {
    if (jobPhotos.length === 0) return
    try {
      await bookingsAPI.uploadBookingPhotos(bookingId, jobPhotos.slice(0, MAX_JOB_PHOTOS))
    } catch (e: any) {
      Alert.alert(
        'Photos',
        getApiErrorMessage(e, 'Booking created but photos failed. Add them from the booking page.')
      )
    }
  }

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
        selectedVehicle,
        {
          ...(minRating != null && minRating > 0 ? { minRating } : {}),
          ...(availableOnly ? { availableOnly: true } : {}),
        }
      )
      const list = Array.isArray(res.data) ? [...res.data] : []
      list.sort((a: any, b: any) => {
        const da = typeof a.distanceKm === 'number' ? a.distanceKm : Infinity
        const db = typeof b.distanceKm === 'number' ? b.distanceKm : Infinity
        return da - db
      })
      setMechanics(list)
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
      const bookingId = res.data.id as string
      await uploadJobPhotosForBooking(bookingId)
      setJobPhotos([])
      navigation.getParent()?.navigate('BookingDetail', { id: bookingId })
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
      const bookingId = res.data.id as string
      await uploadJobPhotosForBooking(bookingId)
      setJobPhotos([])
      navigation.getParent()?.navigate('BookingDetail', { id: bookingId })
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

          <Text style={styles.subSectionLabel}>Or search an address / area</Text>
          <View style={styles.addressSearchRow}>
            <TextInput
              style={styles.addressSearchInput}
              value={addressQuery}
              onChangeText={setAddressQuery}
              placeholder="e.g. Ikeja Lagos, Port Harcourt"
              placeholderTextColor={colors.neutral[400]}
              onSubmitEditing={() => void lookupAddress()}
            />
            <TouchableOpacity
              style={[styles.lookupBtn, addressLookupLoading && styles.lookupBtnDisabled]}
              onPress={() => void lookupAddress()}
              disabled={addressLookupLoading}
            >
              <Text style={styles.lookupBtnText}>{addressLookupLoading ? '…' : 'Look up'}</Text>
            </TouchableOpacity>
          </View>
          {addressSuggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {addressSuggestions.map((r, i) => (
                <TouchableOpacity
                  key={`${r.lat}-${r.lng}-${i}`}
                  style={styles.suggestionRow}
                  onPress={() => selectAddressSuggestion(r)}
                >
                  <Text style={styles.suggestionText} numberOfLines={2}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Filters</Text>
          <Text style={styles.filterHint}>Minimum average rating (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {[
              { label: 'Any', value: null as number | null },
              { label: '3+', value: 3 },
              { label: '4+', value: 4 },
              { label: '4.5+', value: 4.5 },
            ].map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => setMinRating(opt.value)}
                style={[styles.chip, minRating === opt.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, minRating === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Available mechanics only</Text>
            <Switch value={availableOnly} onValueChange={setAvailableOnly} />
          </View>

          <Text style={styles.sectionLabel}>Photos of the issue (optional)</Text>
          <Text style={styles.filterHint}>Up to {MAX_JOB_PHOTOS} images (JPEG, PNG, WebP, max 5MB each)</Text>
          <View style={styles.jobPhotoRow}>
            {jobPhotos.map((p, idx) => (
              <View key={`${p.uri}-${idx}`} style={styles.jobPhotoWrap}>
                <Image source={{ uri: p.uri }} style={styles.jobPhotoThumb} />
                <TouchableOpacity style={styles.jobPhotoRemove} onPress={() => removeJobPhotoAt(idx)}>
                  <Ionicons name="close-circle" size={22} color={colors.accent.red} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {jobPhotos.length < MAX_JOB_PHOTOS ? (
            <TouchableOpacity style={styles.addJobPhotoBtn} onPress={() => void pickJobPhotos()}>
              <Ionicons name="images-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.addJobPhotoText}>Add photos</Text>
            </TouchableOpacity>
          ) : null}

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
          <Text style={styles.sectionLabel}>Issue</Text>
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
                  <View style={styles.mechanicTop}>
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
                        {m.mechanic?.isVerified || m.mechanic?.verified ? (
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
                          <Text style={styles.ratingText}>{rating.toFixed(1)} avg</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.trustRow}>
                    {typeof m.typicalResponseHours === 'number' && m.typicalResponseHours > 0 ? (
                      <View style={styles.trustPill}>
                        <Ionicons name="time-outline" size={14} color={colors.brand.primary} />
                        <Text style={styles.trustPillText}>Responds in ~{m.typicalResponseHours}h</Text>
                      </View>
                    ) : null}
                    {typeof m.jobsCompleted === 'number' && m.jobsCompleted > 0 ? (
                      <View style={styles.trustPill}>
                        <Ionicons name="ribbon-outline" size={14} color={colors.brand.primary} />
                        <Text style={styles.trustPillText}>{m.jobsCompleted} jobs done</Text>
                      </View>
                    ) : null}
                    {typeof m.jobsCompleted === 'number' && m.jobsCompleted >= 8 ? (
                      <View style={styles.trustPill}>
                        <Ionicons name="heart-outline" size={14} color={colors.brand.primary} />
                        <Text style={styles.trustPillText}>Strong repeat use</Text>
                      </View>
                    ) : null}
                  </View>
                  {m.nextAvailableNote ? (
                    <Text style={styles.nextNote} numberOfLines={2}>
                      {m.nextAvailableNote}
                    </Text>
                  ) : null}
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
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[500],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  addressSearchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  addressSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  lookupBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lookupBtnDisabled: { opacity: 0.6 },
  lookupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  suggestionsBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral[200] },
  suggestionText: { fontSize: 14, color: colors.text },
  filterHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, color: colors.text, flex: 1, marginRight: 12 },
  jobPhotoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  jobPhotoWrap: { position: 'relative' },
  jobPhotoThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.neutral[100] },
  jobPhotoRemove: { position: 'absolute', top: -6, right: -6 },
  addJobPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  addJobPhotoText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
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
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
  },
  trustPillText: { fontSize: 12, fontWeight: '600', color: colors.brand.primary },
  nextNote: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
    fontStyle: 'italic',
  },
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
