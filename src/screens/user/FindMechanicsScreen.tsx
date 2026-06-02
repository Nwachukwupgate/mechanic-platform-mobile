import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { setStatusBarStyle } from 'expo-status-bar'
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
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, faultsAPI, bookingsAPI, ratingsAPI, getApiErrorMessage } from '../../services/api'
import { sortFaultsForIssuePicker } from '../../constants/faults'
import {
  nearestMechanicIdsForBadge,
  isVeryCloseStraightLine,
} from '../../utils/mechanicProximityLabels'
import { reverseGeocode, searchAddress, type ReverseGeocodeResult, type GeocodeSearchResult } from '../../services/geocoding'
import { useCurrentLocation, promptOpenLocationSettings } from '../../utils/location'
import {
  validateJobPostingInput,
  RECOMMENDED_JOB_PHOTOS,
} from '../../utils/jobPostingValidation'
import { mechanicPhone } from '../../utils/bookingContact'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { typography } from '../../theme/typography'
import { layout } from '../../theme/layout'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { MechanicsMap, type MechanicMarker } from '../../components/MechanicsMap'
import { HeroDecorativeRings } from '../../components/HeroDecorativeRings'
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn'

const PAD = layout.screenPaddingHorizontal

function SectionHeader({
  icon,
  title,
  first,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  first?: boolean
}) {
  return (
    <View style={[styles.sectionHeader, first && styles.sectionHeaderFirst]}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={18} color={colors.brand.primary} />
      </View>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
  )
}

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
  phone?: string
}

export function FindMechanicsScreen({ navigation, route = {} }: { navigation: any; route?: any }) {
  const insets = useSafeAreaInsets()
  const preferredMechanicId = route.params?.preferredMechanicId as string | undefined
  const preferredMechanicName = route.params?.preferredMechanicName as string | undefined
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

  const handleUseMyLocation = async () => {
    const next = await getLocation()
    if (next.permissionDenied) {
      promptOpenLocationSettings('user')
    }
  }

  const [minRating, setMinRating] = useState<number | null>(null)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [jobPhotos, setJobPhotos] = useState<LocalJobPhoto[]>([])
  const [addressQuery, setAddressQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeSearchResult[]>([])
  const [addressLookupLoading, setAddressLookupLoading] = useState(false)

  const faultsSorted = useMemo(() => sortFaultsForIssuePicker(faults), [faults])

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

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('dark')
    }, [])
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

  const displayMechanics = useMemo(() => {
    if (!preferredMechanicId) return mechanics
    const idx = mechanics.findIndex((x) => x.mechanic?.id === preferredMechanicId)
    if (idx <= 0) return mechanics
    const next = [...mechanics]
    const [picked] = next.splice(idx, 1)
    return [picked, ...next]
  }, [mechanics, preferredMechanicId])

  const nearestBadgeIds = useMemo(() => nearestMechanicIdsForBadge(displayMechanics), [displayMechanics])

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
      Alert.alert('Lookup failed', getApiErrorMessage(e, 'Check your connection and try again.'))
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

  const confirmJobPosting = async (isOpenBoard: boolean): Promise<boolean> => {
    const fault = faults.find((f) => f.id === selectedFault)
    const message = validateJobPostingInput({
      description,
      photoCount: jobPhotos.length,
      faultName: fault?.name,
      isOpenBoard,
    })
    if (!message) return true
    if (message.startsWith('We recommend')) {
      return new Promise((resolve) => {
        Alert.alert('Add photos?', message, [
          { text: 'Add photos', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue anyway', onPress: () => resolve(true) },
        ])
      })
    }
    Alert.alert('More detail needed', message)
    return false
  }

  const requestService = async (mechanicId: string) => {
    if (locationState.lat == null || locationState.lng == null) return
    if (!(await confirmJobPosting(false))) return
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
    if (!(await confirmJobPosting(true))) return
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

  const mechanicMarkers: MechanicMarker[] = useMemo(() => {
    return displayMechanics
      .filter((m) => {
        const lat = m.workshopLat ?? m.mechanic?.workshopLat
        const lng = m.workshopLng ?? m.mechanic?.workshopLng
        return typeof lat === 'number' && typeof lng === 'number'
      })
      .map((m) => {
        const lat = m.workshopLat ?? m.mechanic?.workshopLat ?? 0
        const lng = m.workshopLng ?? m.mechanic?.workshopLng ?? 0
        const id = m.mechanic?.id ?? ''
        const parts: string[] = []
        if (typeof m.distanceKm === 'number' && !Number.isNaN(m.distanceKm)) {
          parts.push(`${m.distanceKm.toFixed(1)} km (straight-line)`)
        }
        if (nearestBadgeIds.has(id)) parts.push('Nearest')
        if (isVeryCloseStraightLine(m.distanceKm)) parts.push('Very close')
        return {
          id,
          latitude: lat,
          longitude: lng,
          title: m.mechanic?.companyName || 'Garage',
          description: parts.length > 0 ? parts.join(' · ') : undefined,
        }
      })
  }, [displayMechanics, nearestBadgeIds])

  if (loading) return <LoadingOverlay />

  const heroPadTop = Math.max(insets.top, 10) + 8

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroShell}>
          <HeroDecorativeRings />
          <View style={[styles.heroInner, { paddingTop: heroPadTop }]}>
            <View style={styles.heroTop}>
              <View style={styles.logoChip}>
                <View style={styles.logoDot}>
                  <Ionicons name="search" size={12} color="#fff" />
                </View>
                <Text style={styles.logoChipText} numberOfLines={1}>
                  Find garages
                </Text>
              </View>
            </View>
            <AnimatedFadeIn>
              <Text style={styles.heroTitle}>Nearby workshops</Text>
              <Text style={styles.heroSubtitle}>
                Set where you are, your car, and the issue. Search for matches or post the job for quotes.
              </Text>
            </AnimatedFadeIn>
          </View>
        </View>

        {preferredMechanicId ? (
          <AnimatedFadeIn delay={80}>
            <View style={styles.blockPad}>
              <Card style={styles.preferredBanner}>
                <View style={styles.preferredBannerInner}>
                  <View style={styles.preferredIconCircle}>
                    <Ionicons name="pin" size={18} color={colors.brand.forest} />
                  </View>
                  <Text style={styles.preferredBannerText}>
                    {preferredMechanicName
                      ? `${preferredMechanicName} is pinned to the top of the list after you search.`
                      : 'Your chosen garage is pinned to the top of the list after you search.'}
                  </Text>
                </View>
              </Card>
            </View>
          </AnimatedFadeIn>
        ) : null}

        <AnimatedFadeIn delay={preferredMechanicId ? 120 : 90}>
          <View style={styles.blockPad}>
            <Card style={styles.surfaceCard}>
              <SectionHeader icon="navigate" title="Location" first />
          <Button
            title={locationLoading ? 'Getting location…' : 'Use my location'}
            onPress={() => void handleUseMyLocation()}
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
              <ActivityIndicator size="small" color={colors.brand.primary} />
              <Text style={styles.addressPreview}>Looking up address…</Text>
            </View>
          )}
          {!addressLoading && addressPreview && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color={colors.brand.primary} />
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

              <SectionHeader icon="options" title="Filters" />
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
          <View style={[styles.switchRow, styles.switchRowInset]}>
            <Text style={styles.switchLabel}>Available mechanics only</Text>
            <Switch value={availableOnly} onValueChange={setAvailableOnly} />
          </View>
            </Card>
          </View>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={preferredMechanicId ? 160 : 130}>
          <View style={[styles.blockPad, styles.blockPadTight]}>
            <Card style={styles.surfaceCard}>
              <SectionHeader icon="images" title="Photos" first />
          <Text style={styles.filterHint}>
            Add at least {RECOMMENDED_JOB_PHOTOS} clear photos when you can. Mechanics quote from your notes and
            images. You can also call them while comparing quotes.
          </Text>
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
              <Ionicons name="images-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.addJobPhotoText}>Add photos</Text>
            </TouchableOpacity>
          ) : null}

              <SectionHeader icon="car-sport" title="Vehicle" />
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
              <SectionHeader icon="construct" title="Issue" />
          <Text style={styles.filterHint}>
            If nothing fits, pick &quot;Other electrical&quot; or &quot;Other mechanical&quot; and describe it below (and add photos if you can).
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {faultsSorted.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedFault(f.id)}
                style={[styles.chip, selectedFault === f.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedFault === f.id && styles.chipTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
              <SectionHeader icon="document-text" title="Describe the issue" />
          <Text style={styles.filterHint}>
            Optional. Include when it started, symptoms, warning lights, and sounds if you can.
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Grinding noise when braking from 60km/h, started last week, no warning lights..."
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
          </View>
        </AnimatedFadeIn>

        {searching && (
          <AnimatedFadeIn>
            <View style={[styles.blockPad, styles.blockPadTight]}>
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={colors.brand.primary} />
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
            </View>
          </AnimatedFadeIn>
        )}

        {!searching && mechanics.length > 0 && (
          <AnimatedFadeIn delay={40}>
            <View style={[styles.blockPad, styles.blockPadTight]}>
              <View style={styles.resultsHeader}>
                <View style={styles.resultsTitleBlock}>
                  <Text style={styles.resultsTitle}>Nearby mechanics</Text>
                  <Text style={styles.resultsProximityNote} numberOfLines={2}>
                    Straight-line km, not drive time.
                  </Text>
                </View>
                <View style={styles.toggleShell}>
                  <TouchableOpacity
                    onPress={() => setViewMode('list')}
                    style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                  >
                    <Ionicons name="list" size={17} color={viewMode === 'list' ? '#fff' : colors.brand.forest} />
                    <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setViewMode('map')}
                    style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                  >
                    <Ionicons name="map" size={17} color={viewMode === 'map' ? '#fff' : colors.brand.forest} />
                    <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {viewMode === 'map' && locationState.lat != null && locationState.lng != null && (
                <View style={styles.mapWrap}>
                  <MechanicsMap
                    userLat={locationState.lat}
                    userLng={locationState.lng}
                    mechanics={mechanicMarkers}
                    style={styles.mapBlock}
                  />
                </View>
              )}

            {viewMode === 'list' ? (
              <View style={styles.mechanicListWrap}>
                {displayMechanics.map((m: MechanicResult) => {
              const mid = m.mechanic?.id
              const rating = mid ? ratings[mid] : undefined
              const garagePhone = mechanicPhone(m)
              return (
                <Card key={mid} style={styles.mechanicCard}>
                  {typeof m.distanceKm === 'number' && !Number.isNaN(m.distanceKm) ? (
                    <View style={styles.mechanicDistCorner}>
                      <View style={styles.mechanicDistBadge}>
                        <Ionicons name="navigate-outline" size={12} color={colors.brand.forest} />
                        <Text style={styles.mechanicDistText}>{m.distanceKm.toFixed(1)} km</Text>
                      </View>
                      {mid && nearestBadgeIds.has(mid) ? (
                        <View style={styles.nearestPill}>
                          <Ionicons name="location" size={11} color={colors.accent.amber} />
                          <Text style={styles.nearestPillText}>Nearest</Text>
                        </View>
                      ) : null}
                      {isVeryCloseStraightLine(m.distanceKm) ? (
                        <Text style={styles.proximityCaption}>Very close · straight-line</Text>
                      ) : null}
                    </View>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="View garage profile"
                    onPress={() => {
                      if (!mid) return
                      navigation.getParent()?.navigate('MechanicPublicProfile', {
                        mechanicId: mid,
                        preferredMechanicName:
                          m.mechanic?.companyName || m.mechanic?.ownerFullName || undefined,
                        fromNearbySummary: {
                          jobsCompleted: typeof m.jobsCompleted === 'number' ? m.jobsCompleted : undefined,
                          distanceKm: typeof m.distanceKm === 'number' ? m.distanceKm : undefined,
                          averageRating:
                            typeof m.averageRating === 'number' && !Number.isNaN(m.averageRating)
                              ? m.averageRating
                              : undefined,
                          typicalResponseHours:
                            typeof m.typicalResponseHours === 'number' ? m.typicalResponseHours : undefined,
                          nextAvailableNote: m.nextAvailableNote ?? undefined,
                        },
                      })
                    }}
                  >
                    <View
                      style={[
                        styles.mechanicTop,
                        typeof m.distanceKm === 'number' && !Number.isNaN(m.distanceKm)
                          ? styles.mechanicTopWithBadge
                          : null,
                      ]}
                    >
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
                  {garagePhone ? (
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => Linking.openURL(`tel:${garagePhone.replace(/\s/g, '')}`)}
                      accessibilityLabel="Call garage"
                    >
                      <Ionicons name="call-outline" size={16} color={colors.primary[600]} />
                      <Text style={styles.phoneText}>{garagePhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  </TouchableOpacity>
                  <Button
                    title={requestingId === mid ? 'Requesting…' : 'Request service'}
                    onPress={() => mid && requestService(mid)}
                    loading={requestingId === mid}
                    style={styles.reqBtn}
                  />
                </Card>
              )
                })
                }
              </View>
            ) : null}
            </View>
          </AnimatedFadeIn>
        )}

        {!searching && mechanics.length === 0 && (
          <View style={[styles.blockPad, styles.emptySection]}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="construct-outline" size={40} color={colors.brand.primary} />
            </View>
            <Text style={styles.emptyTitle}>{hasSearched ? 'No mechanics found' : 'Ready when you are'}</Text>
            <Text style={styles.emptyText}>
              {hasSearched
                ? 'No nearby garages matched. Try a different issue or check your location.'
                : 'Set your location above, then tap Search mechanics to see garages near you.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40, width: '100%', paddingTop: 0 },

  heroShell: {
    width: '100%',
    backgroundColor: colors.brand.forest,
    borderBottomLeftRadius: layout.heroBottomRadius,
    borderBottomRightRadius: layout.heroBottomRadius,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.brand.forest,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  heroInner: {
    paddingHorizontal: PAD,
    paddingBottom: 26,
    position: 'relative',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  logoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    alignSelf: 'flex-start',
  },
  logoDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#f8fafc',
    letterSpacing: 0.35,
  },
  heroTitle: { ...typography.titleSmall, color: '#f8fafc', letterSpacing: -0.3, marginBottom: 8 },
  heroSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(248,250,252,0.55)',
  },

  blockPad: { paddingHorizontal: PAD },
  blockPadTight: { marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderFirst: { marginTop: 0 },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    ...typography.section,
    fontSize: 16,
    color: colors.brand.forest,
    flex: 1,
  },

  surfaceCard: {
    padding: 20,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  preferredBanner: {
    padding: 16,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.primary,
  },
  preferredBannerInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  preferredIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  preferredBannerText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },

  subSectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.neutral[500],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  addressSearchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  addressSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: layout.cardRadiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  lookupBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: layout.cardRadiusSmall,
  },
  lookupBtnDisabled: { opacity: 0.6 },
  lookupBtnText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  suggestionsBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: layout.cardRadiusSmall,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  suggestionText: { fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  filterHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, marginBottom: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 10,
  },
  switchRowInset: {
    marginTop: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral[50],
    borderRadius: layout.cardRadiusSmall,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  switchLabel: { fontSize: 15, fontFamily: fonts.regular, color: colors.text, flex: 1, marginRight: 12 },
  jobPhotoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  jobPhotoWrap: { position: 'relative' },
  jobPhotoThumb: {
    width: 76,
    height: 76,
    borderRadius: layout.cardRadiusSmall,
    backgroundColor: colors.neutral[100],
  },
  jobPhotoRemove: { position: 'absolute', top: -6, right: -6 },
  addJobPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: layout.cardRadiusSmall,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  addJobPhotoText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.brand.primary },
  locationBtn: { marginTop: 8 },
  hint: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  addressPreview: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  errorText: { fontSize: 14, fontFamily: fonts.regular, color: colors.accent.red, flex: 1 },
  dismissText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.brand.primary },
  chips: { marginTop: 8, marginHorizontal: -2 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.neutral[100],
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  chipText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  chipTextActive: { color: '#fff' },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: layout.cardRadiusSmall,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 88,
    marginTop: 8,
    textAlignVertical: 'top',
    backgroundColor: colors.neutral[50],
  },
  actionRow: { gap: 12, marginTop: 22 },
  searchBtn: {},
  postJobBtn: {},

  loadingSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 },
  loadingSectionText: { fontSize: 15, fontFamily: fonts.regular, color: colors.textSecondary },
  skeletonList: { marginTop: 8 },
  skeletonCard: {
    marginBottom: layout.listCardGap,
    borderRadius: layout.cardRadius,
    padding: 18,
  },
  skeletonLine: { height: 14, borderRadius: 6, backgroundColor: colors.neutral[200] },
  skeletonButton: { height: 48, borderRadius: layout.cardRadiusSmall, backgroundColor: colors.neutral[200] },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  resultsTitleBlock: { flex: 1, minWidth: 140 },
  resultsTitle: {
    ...typography.section,
    fontSize: 17,
    color: colors.brand.forest,
  },
  resultsProximityNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  toggleShell: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 46, 26, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(12, 46, 26, 0.1)',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: colors.brand.primary,
  },
  toggleText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.brand.forest },
  toggleTextActive: { color: '#fff' },

  mapWrap: {
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  mapBlock: { marginBottom: 0, height: 240 },
  mechanicListWrap: { gap: 0 },

  mechanicCard: {
    marginBottom: layout.listCardGap,
    padding: 18,
    paddingTop: 20,
    position: 'relative',
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  mechanicDistCorner: {
    position: 'absolute',
    top: 14,
    right: 14,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 1,
    maxWidth: '52%',
  },
  mechanicDistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  nearestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  nearestPillText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.brand.forest },
  proximityCaption: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 14,
  },
  mechanicDistText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.brand.forest },
  mechanicTop: { flexDirection: 'row', alignItems: 'flex-start' },
  mechanicTopWithBadge: { paddingRight: 116 },
  avatar: { width: 58, height: 58, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[100] },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  mechanicInfo: { flex: 1, marginLeft: 14 },
  mechanicNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  mechanicName: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.accent.green },
  mechanicOwner: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  trustPillText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.brand.primary },
  nextNote: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  bio: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 12, lineHeight: 22 },
  expertiseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  expertiseChip: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  expertiseChipText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary[800] },
  addr: { fontSize: 13, fontFamily: fonts.regular, color: colors.neutral[500], marginTop: 10 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  phoneText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.primary[600] },
  reqBtn: { marginTop: 16 },

  emptySection: { alignItems: 'center', paddingVertical: 36, marginTop: 8 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.brand.forest, marginTop: 8 },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
})
