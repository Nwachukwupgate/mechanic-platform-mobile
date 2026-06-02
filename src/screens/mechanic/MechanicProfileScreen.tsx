import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Linking,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import {
  mechanicsAPI,
  getApiErrorMessage,
  isPropertyNotAllowedError,
} from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useCurrentLocation, promptOpenLocationSettings } from '../../utils/location'
import { reverseGeocode } from '../../services/geocoding'
import { MECHANIC_VEHICLE_TYPES, EXPERTISE_OPTIONS } from '../../constants/mechanic'
import { CAR_BRANDS } from '../../constants/vehicles'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { gradients } from '../../theme/gradients'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { EmptyState } from '../../components/EmptyState'
import { CollapsibleProfileSection } from '../../components/CollapsibleProfileSection'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const MAX_AVATAR_BYTES = 10 * 1024 * 1024

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

/** API returns editable fields under `data.profile` (same as web); support flat root for older responses. */
function readMechanicProfileFields(data: any) {
  const root = data && typeof data === 'object' ? data : {}
  const p = root.profile && typeof root.profile === 'object' ? root.profile : {}
  const first = (keys: string[]) => {
    for (const k of keys) {
      const v = p[k]
      if (v !== undefined && v !== null) return v
      const r = root[k]
      if (r !== undefined && r !== null) return r
    }
    return undefined
  }
  const rawLat = first(['latitude', 'workshopLat'])
  const rawLng = first(['longitude', 'workshopLng'])
  const lat = typeof rawLat === 'number' ? rawLat : rawLat != null ? Number(rawLat) : NaN
  const lng = typeof rawLng === 'number' ? rawLng : rawLng != null ? Number(rawLng) : NaN
  const thr = first(['typicalResponseHours'])
  return {
    companyName: (first(['companyName']) as string) ?? root.companyName ?? '',
    ownerFullName: (first(['ownerFullName']) as string) ?? root.ownerFullName ?? '',
    email: (first(['email']) as string) ?? root.email ?? '',
    isVerified: root.isVerified === true,
    profileUpdatedAt: p.updatedAt != null ? String(p.updatedAt) : null,
    phone: (first(['phone']) as string) ?? '',
    experience: (first(['experience']) as string) ?? '',
    bio: (first(['bio']) as string) ?? '',
    workshopAddress: (first(['workshopAddress']) as string) ?? '',
    workshopLat: Number.isFinite(lat) ? lat : null,
    workshopLng: Number.isFinite(lng) ? lng : null,
    address: (first(['address']) as string) ?? '',
    city: (first(['city']) as string) ?? '',
    state: (first(['state']) as string) ?? '',
    zipCode: (first(['zipCode']) as string) ?? '',
    nin: (first(['nin']) as string) ?? '',
    guarantorName: (first(['guarantorName']) as string) ?? '',
    guarantorPhone: (first(['guarantorPhone']) as string) ?? '',
    guarantorAddress: (first(['guarantorAddress']) as string) ?? '',
    vehicleTypes: Array.isArray(first(['vehicleTypes'])) ? (first(['vehicleTypes']) as string[]) : [],
    expertise: Array.isArray(first(['expertise'])) ? (first(['expertise']) as string[]) : [],
    brands: Array.isArray(first(['brands'])) ? (first(['brands']) as string[]) : [],
    typicalResponseHours: thr != null && thr !== '' ? String(thr) : '',
    nextAvailableNote: (first(['nextAvailableNote']) as string) ?? '',
    availability: (first(['availability']) as boolean | undefined) ?? true,
    avatarUrl: (first(['avatar', 'avatarUrl']) as string) ?? null,
    certificateUrl: (first(['certificateUrl']) as string) ?? null,
  }
}

function MechanicProfileSkeleton() {
  const bar = (w: string | number) => (
    <View style={[styles.skBar, typeof w === 'string' ? { width: w as `${number}%` } : { width: w }]} />
  )
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[...gradients.heroRich]} style={styles.heroGradient}>
        <View style={[styles.avatar, styles.skBone, { borderRadius: 48 }]} />
        {bar('60%')}
        {bar('40%')}
      </LinearGradient>
      <Card style={styles.profileCard}>
        {bar('100%')}
        {bar('80%')}
        {bar('90%')}
      </Card>
    </ScrollView>
  )
}

export function MechanicProfileScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [pickerOpen, setPickerOpen] = useState<'vehicleTypes' | 'expertise' | 'brands' | null>(null)
  const { getLocation, locationState, locationLoading, clearError } = useCurrentLocation()
  const [locationRequested, setLocationRequested] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null)
  const [saveToast, setSaveToast] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [sectionsInitialized, setSectionsInitialized] = useState(false)
  const pillScale = useRef(new Animated.Value(1)).current
  const scrollRef = useRef<ScrollView>(null)

  const [sectionOpen, setSectionOpen] = useState({
    account: true,
    visibility: true,
    workshop: true,
    documents: true,
  })

  const [form, setForm] = useState({
    phone: '',
    experience: '',
    bio: '',
    workshopAddress: '',
    workshopLat: null as number | null,
    workshopLng: null as number | null,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    nin: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: '',
    vehicleTypes: [] as string[],
    expertise: [] as string[],
    brands: [] as string[],
    typicalResponseHours: '',
    nextAvailableNote: '',
  })

  const applyFromServer = useCallback((p: any) => {
    setProfile(p)
    const m = readMechanicProfileFields(p)
    setAvatarUrl(m.avatarUrl || null)
    setCertificateUrl(m.certificateUrl || null)
    setForm({
      phone: m.phone,
      experience: m.experience,
      bio: m.bio,
      workshopAddress: m.workshopAddress,
      workshopLat: m.workshopLat,
      workshopLng: m.workshopLng,
      address: m.address,
      city: m.city,
      state: m.state,
      zipCode: m.zipCode,
      nin: m.nin,
      guarantorName: m.guarantorName,
      guarantorPhone: m.guarantorPhone,
      guarantorAddress: m.guarantorAddress,
      vehicleTypes: m.vehicleTypes,
      expertise: m.expertise,
      brands: m.brands,
      typicalResponseHours: m.typicalResponseHours,
      nextAvailableNote: m.nextAvailableNote,
    })
  }, [])

  const display = useMemo(() => readMechanicProfileFields(profile), [profile])
  const stats = profile?.stats as
    | { averageRating: number | null; ratingCount: number; jobsCompleted: number; quoteWinRate: number | null }
    | undefined

  const isAvailable = display.availability !== false
  const [availabilityOptimistic, setAvailabilityOptimistic] = useState<boolean | null>(null)
  const showAvailable = availabilityOptimistic ?? isAvailable

  useEffect(() => {
    mechanicsAPI
      .getProfile()
      .then((res) => applyFromServer(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [applyFromServer])

  useEffect(() => {
    if (loading || !profile || sectionsInitialized) return
    const hasLoc = !!(form.workshopAddress?.trim() && display.workshopLat != null)
    const hasServices = form.vehicleTypes.length > 0 && form.expertise.length > 0
    const customersOk = form.bio.trim().length >= 20 && !!form.typicalResponseHours?.trim()
    const docsOk = !!(avatarUrl && certificateUrl)
    setSectionOpen({
      account: true,
      visibility: !customersOk,
      workshop: !(hasLoc && hasServices),
      documents: !docsOk,
    })
    setSectionsInitialized(true)
  }, [loading, profile, sectionsInitialized, form, display, avatarUrl, certificateUrl])

  useEffect(() => {
    pillScale.setValue(0.94)
    Animated.spring(pillScale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }).start()
  }, [showAvailable, pillScale])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await mechanicsAPI.getProfile()
      applyFromServer(res.data)
    } catch {
      /* keep existing */
    } finally {
      setRefreshing(false)
    }
  }, [applyFromServer])

  const hapticSuccess = () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      /* no-op */
    }
  }

  const hapticLight = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {
      /* no-op */
    }
  }

  const toggleSection = (key: keyof typeof sectionOpen) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSectionOpen((s) => ({ ...s, [key]: !s[key] }))
    hapticLight()
  }

  const profileStrength = useMemo(() => {
    const hasPhoto = !!avatarUrl
    const hasCert = !!certificateUrl
    const hasWorkshop =
      !!form.workshopAddress?.trim() && form.workshopLat != null && form.workshopLng != null
    const hasReply = !!form.typicalResponseHours?.trim()
    const hasBio = form.bio.trim().length >= 20
    const items = [
      { key: 'documents' as const, id: 'photo' as const, label: 'Workshop photo', done: hasPhoto },
      { key: 'documents' as const, id: 'cert' as const, label: 'Certificate', done: hasCert },
      { key: 'workshop' as const, id: 'loc' as const, label: 'Workshop location', done: hasWorkshop },
      { key: 'visibility' as const, id: 'reply' as const, label: 'Reply time', done: hasReply },
      { key: 'visibility' as const, id: 'bio' as const, label: 'Bio (20+ chars)', done: hasBio },
    ]
    const doneCount = items.filter((i) => i.done).length
    return { items, doneCount, total: items.length }
  }, [avatarUrl, certificateUrl, form])

  const openStrengthItem = (section: keyof typeof sectionOpen) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSectionOpen((s) => ({ ...s, [section]: true }))
    hapticLight()
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350)
  }

  const pickImage = async (type: 'avatar' | 'certificate') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to upload.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: type === 'avatar',
      aspect: type === 'avatar' ? [1, 1] : undefined,
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    if (type === 'avatar' && asset.fileSize != null && asset.fileSize > MAX_AVATAR_BYTES) {
      Alert.alert('Too large', 'Profile photo must be under 10MB. Try a smaller image or crop it.')
      return
    }
    const uri = asset.uri
    const name = uri.split('/').pop() || (type === 'avatar' ? 'avatar.jpg' : 'certificate.jpg')
    const file = { uri, name, type: asset.mimeType || 'image/jpeg' }
    if (type === 'avatar') {
      setUploadingAvatar(true)
      try {
        // Use the URL returned by the upload so the preview shows immediately,
        // independent of when the server persists/returns it on the next fetch.
        const res = await mechanicsAPI.uploadAvatar(file as any)
        const newUrl = res.data?.avatarUrl
        if (newUrl) setAvatarUrl(newUrl)
        hapticSuccess()
      } catch (e: any) {
        Alert.alert('Error', getApiErrorMessage(e))
      } finally {
        setUploadingAvatar(false)
      }
    } else {
      setUploadingCert(true)
      try {
        const res = await mechanicsAPI.uploadCertificate(file as any)
        const newUrl = res.data?.certificateUrl
        if (newUrl) setCertificateUrl(newUrl)
        hapticSuccess()
      } catch (e: any) {
        Alert.alert('Error', getApiErrorMessage(e))
      } finally {
        setUploadingCert(false)
      }
    }
  }

  const useMyLocation = async () => {
    const next = await getLocation()
    if (next.permissionDenied) {
      promptOpenLocationSettings('mechanic')
      return
    }
    setLocationRequested(true)
  }

  useEffect(() => {
    if (!locationRequested || locationState.lat == null || locationState.lng == null) return
    setLocationRequested(false)
    let cancelled = false
    reverseGeocode(locationState.lat, locationState.lng)
      .then((r) => {
        if (!cancelled) {
          setForm((f) => ({
            ...f,
            workshopAddress: r.fullAddress || `${locationState.lat}, ${locationState.lng}`,
            workshopLat: locationState.lat,
            workshopLng: locationState.lng,
          }))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setForm((f) => ({
            ...f,
            workshopLat: locationState.lat,
            workshopLng: locationState.lng,
            workshopAddress: `${locationState.lat?.toFixed(4)}, ${locationState.lng?.toFixed(4)}`,
          }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [locationRequested, locationState.lat, locationState.lng])

  const buildProfilePayload = useCallback(() => {
    const typicalResponseHours =
      form.typicalResponseHours.trim() === ''
        ? null
        : (() => {
            const n = Number(form.typicalResponseHours)
            return Number.isFinite(n) && n > 0 ? n : null
          })()
    return {
      phone: form.phone.trim() || undefined,
      experience: form.experience.trim() || undefined,
      bio: form.bio.trim() || undefined,
      workshopAddress: form.workshopAddress.trim() || undefined,
      latitude: form.workshopLat ?? null,
      longitude: form.workshopLng ?? null,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zipCode: form.zipCode.trim() || undefined,
      typicalResponseHours,
      nextAvailableNote: form.nextAvailableNote.trim() || null,
      nin: form.nin.trim() || undefined,
      guarantorName: form.guarantorName.trim() || undefined,
      guarantorPhone: form.guarantorPhone.trim() || undefined,
      guarantorAddress: form.guarantorAddress.trim() || undefined,
      vehicleTypes: form.vehicleTypes.length ? form.vehicleTypes : undefined,
      expertise: form.expertise.length ? form.expertise : undefined,
      brands: (form.brands ?? []).length ? (form.brands ?? []) : undefined,
      certificateUrl: certificateUrl ?? null,
      avatar: avatarUrl ?? null,
    }
  }, [form, certificateUrl, avatarUrl])

  const save = async () => {
    setError('')
    setSaving(true)
    const payload: any = buildProfilePayload()
    const persist = async (body: typeof payload) => {
      await mechanicsAPI.updateProfile(body)
      const refreshed = await mechanicsAPI.getProfile()
      applyFromServer(refreshed.data)
    }
    try {
      await persist(payload)
      setLastSavedAt(new Date())
      setSaveToast(true)
      hapticSuccess()
      setTimeout(() => setSaveToast(false), 2800)
    } catch (e: any) {
      if (isPropertyNotAllowedError(e, 'brands')) {
        const withoutBrands = { ...payload }
        delete withoutBrands.brands
        try {
          await persist(withoutBrands)
          setLastSavedAt(new Date())
          setSaveToast(true)
          hapticSuccess()
          setTimeout(() => setSaveToast(false), 2800)
        } catch (e2: any) {
          setError(getApiErrorMessage(e2))
        }
      } else if (
        isPropertyNotAllowedError(e, 'typicalResponseHours') ||
        isPropertyNotAllowedError(e, 'nextAvailableNote')
      ) {
        const trimmed = { ...payload }
        delete trimmed.typicalResponseHours
        delete trimmed.nextAvailableNote
        try {
          await persist(trimmed)
          setLastSavedAt(new Date())
          setSaveToast(true)
          hapticSuccess()
          setTimeout(() => setSaveToast(false), 2800)
        } catch (e2: any) {
          setError(getApiErrorMessage(e2))
        }
      } else {
        setError(getApiErrorMessage(e))
      }
    } finally {
      setSaving(false)
    }
  }

  const setAvailability = async (next: boolean) => {
    if (next === isAvailable && availabilityOptimistic === null) return
    setAvailabilityOptimistic(next)
    setToggling(true)
    try {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      } catch {
        /* no-op */
      }
      await mechanicsAPI.updateAvailability(next)
      const refreshed = await mechanicsAPI.getProfile()
      applyFromServer(refreshed.data)
      hapticSuccess()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setAvailabilityOptimistic(null)
      setToggling(false)
    }
  }

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'Your profile and bank details will be removed. Past bookings and ratings may be kept for records. You will be signed out. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingAccount(true)
              try {
                await mechanicsAPI.deleteAccount()
                logout()
              } catch (e: any) {
                Alert.alert('Could not delete account', getApiErrorMessage(e))
              } finally {
                setDeletingAccount(false)
              }
            })()
          },
        },
      ],
    )
  }

  const toggleMulti = (key: 'vehicleTypes' | 'expertise' | 'brands', value: string) => {
    setForm((f) => {
      const arr = f[key]
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
      return { ...f, [key]: next }
    })
  }

  if (loading && !profile) return <MechanicProfileSkeleton />

  const ratingLabel =
    stats && stats.ratingCount > 0 && stats.averageRating != null
      ? `${stats.averageRating} \u2605`
      : '…'
  const jobsLabel = stats != null ? String(stats.jobsCompleted) : '…'
  const winLabel = stats?.quoteWinRate != null ? `${stats.quoteWinRate}%` : '…'

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />}
    >
      {saveToast ? (
        <View style={styles.saveToast}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary[700]} />
          <Text style={styles.saveToastText}>Profile saved</Text>
        </View>
      ) : null}

      <LinearGradient colors={[...gradients.heroRich]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
        <View style={styles.heroAvatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.heroAvatar} />
          ) : (
            <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder]}>
              <Ionicons name="camera-outline" size={36} color={colors.neutral[400]} />
            </View>
          )}
        </View>
        <Text style={styles.heroTitle}>{display.companyName || user?.companyName || 'Your workshop'}</Text>
        <Text style={styles.heroSubtitle}>
          {[display.ownerFullName, display.email || user?.email].filter(Boolean).join(', ') || '…'}
        </Text>
        <View style={styles.heroChips}>
          <View style={styles.mechanicChip}>
            <Ionicons name="construct-outline" size={14} color={colors.primary[700]} />
            <Text style={styles.mechanicChipText}>Mechanic</Text>
          </View>
          {display.isVerified ? (
            <View style={styles.verifiedChip}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary[700]} />
              <Text style={styles.verifiedChipText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.pendingChip}>
              <Ionicons name="time-outline" size={14} color={colors.neutral[600]} />
              <Text style={styles.pendingChipText}>Verification pending</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{ratingLabel}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{jobsLabel}</Text>
            <Text style={styles.statLabel}>Jobs done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{winLabel}</Text>
            <Text style={styles.statLabel}>Quote wins</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.availabilityCard}>
        <View style={styles.availabilityHeader}>
          <View style={styles.availabilityCopy}>
            <View style={styles.availabilityTitleRow}>
              <Ionicons
                name={showAvailable ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={showAvailable ? colors.primary[600] : colors.neutral[500]}
              />
              <Text style={styles.availabilityTitle}>Taking new jobs</Text>
            </View>
            <Text style={styles.availabilityHint}>
              {showAvailable
                ? 'You appear in search and can receive direct requests.'
                : 'You are hidden from search and won’t get new requests until you turn this back on.'}
            </Text>
          </View>
          {toggling ? (
            <ActivityIndicator color={colors.primary[600]} style={styles.availSpinner} />
          ) : (
            <Switch
              value={showAvailable}
              onValueChange={(v) => void setAvailability(v)}
              disabled={toggling}
              trackColor={{ false: colors.neutral[300], true: colors.primary[200] }}
              thumbColor={showAvailable ? colors.primary[600] : colors.neutral[100]}
              ios_backgroundColor={colors.neutral[300]}
            />
          )}
        </View>
        <Animated.View
          style={[
            styles.availabilityPill,
            showAvailable ? styles.availabilityPillOn : styles.availabilityPillOff,
            { transform: [{ scale: pillScale }] },
          ]}
        >
          <Ionicons
            name={showAvailable ? 'checkmark-circle' : 'pause-circle'}
            size={18}
            color={showAvailable ? colors.primary[700] : colors.neutral[600]}
          />
          <Text style={[styles.availabilityPillText, showAvailable ? styles.availabilityPillTextOn : styles.availabilityPillTextOff]}>
            {showAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </Animated.View>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.strengthBlock}>
          <View style={styles.strengthHeader}>
            <Ionicons name="trending-up-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.strengthTitle}>Profile strength</Text>
            <Text style={styles.strengthCount}>
              {profileStrength.doneCount}/{profileStrength.total}
            </Text>
          </View>
          <View style={styles.strengthBarBg}>
            <View
              style={[
                styles.strengthBarFill,
                { width: `${(profileStrength.doneCount / profileStrength.total) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.strengthChips}>
            {profileStrength.items.map((it) => (
              <TouchableOpacity
                key={it.id}
                style={[styles.strengthChip, it.done && styles.strengthChipDone]}
                onPress={() => openStrengthItem(it.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={it.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={it.done ? colors.primary[700] : colors.neutral[400]}
                />
                <Text style={[styles.strengthChipText, it.done && styles.strengthChipTextDone]}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <CollapsibleProfileSection
          title="Account & contact"
          icon="person-outline"
          expanded={sectionOpen.account}
          onToggle={() => toggleSection('account')}
        >
          <View style={styles.readOnlyBlock}>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Company name</Text>
              <Text style={styles.readOnlyValue}>{display.companyName || user?.companyName || '…'}</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Owner name</Text>
              <Text style={styles.readOnlyValue}>{display.ownerFullName || '…'}</Text>
            </View>
            <View style={[styles.readOnlyRow, styles.readOnlyRowLast]}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{display.email || user?.email || '…'}</Text>
            </View>
          </View>
          <View style={styles.formGroup}>
            <Input label="Phone" value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} />
            <Input
              label="Years of experience"
              value={form.experience}
              onChangeText={(t) => setForm((f) => ({ ...f, experience: t }))}
              keyboardType="number-pad"
              style={styles.inputSpaced}
            />
          </View>
        </CollapsibleProfileSection>

        <CollapsibleProfileSection
          title="How customers see you"
          icon="chatbubbles-outline"
          expanded={sectionOpen.visibility}
          onToggle={() => toggleSection('visibility')}
          badge="Trust"
        >
          <Text style={styles.hintText}>Optional fields shown on direct requests.</Text>
          <View style={styles.formGroup}>
            <Input
              label="Usually replies within (hours)"
              value={form.typicalResponseHours}
              onChangeText={(t) => setForm((f) => ({ ...f, typicalResponseHours: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="e.g. 4"
            />
            <Input
              label="Next availability note"
              value={form.nextAvailableNote}
              onChangeText={(t) => setForm((f) => ({ ...f, nextAvailableNote: t }))}
              placeholder="e.g. Earliest slot: tomorrow afternoon"
              style={styles.inputSpaced}
            />
          </View>
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            value={form.bio}
            onChangeText={(t) => setForm((f) => ({ ...f, bio: t }))}
            placeholder="Short description of your workshop..."
            placeholderTextColor={colors.neutral[400]}
            multiline
          />
        </CollapsibleProfileSection>

        <CollapsibleProfileSection
          title="Workshop & services"
          icon="location-outline"
          expanded={sectionOpen.workshop}
          onToggle={() => toggleSection('workshop')}
        >
          <Text style={[styles.sectionLabelInline, { marginTop: 0 }]}>Vehicle types</Text>
          <TouchableOpacity
            style={styles.selectChip}
            onPress={() => {
              setPickerOpen('vehicleTypes')
            }}
          >
            <Text style={styles.selectChipText}>
              {form.vehicleTypes.length ? form.vehicleTypes.join(', ') : 'Select'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.neutral[500]} />
          </TouchableOpacity>
          <Text style={styles.sectionLabelInline}>Expertise</Text>
          <Text style={styles.hintText}>Mechanical covers engine, brakes and transmission.</Text>
          <TouchableOpacity style={styles.selectChip} onPress={() => setPickerOpen('expertise')}>
            <Text style={styles.selectChipText}>
              {form.expertise.length ? form.expertise.join(', ') : 'Select'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.neutral[500]} />
          </TouchableOpacity>
          <Text style={styles.sectionLabelInline}>Car brands</Text>
          <Text style={styles.hintText}>Brands you can service.</Text>
          <TouchableOpacity style={styles.selectChip} onPress={() => setPickerOpen('brands')}>
            <Text style={styles.selectChipText}>
              {(form.brands ?? []).length ? (form.brands ?? []).join(', ') : 'Select'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.neutral[500]} />
          </TouchableOpacity>
          <Text style={styles.sectionLabelInline}>Workshop location</Text>
          <View style={styles.formGroup}>
            <Input
              label="Address"
              value={form.workshopAddress}
              onChangeText={(t) => setForm((f) => ({ ...f, workshopAddress: t }))}
              placeholder="Or use button below"
            />
            <Button
              title={locationLoading ? 'Getting location…' : 'Use my location'}
              onPress={() => void useMyLocation()}
              loading={locationLoading}
              variant="outline"
              style={styles.formBtn}
            />
            {locationState.error ? (
              <View style={styles.locationErrorRow}>
                <Text style={styles.locationErrorText}>{locationState.error}</Text>
                <TouchableOpacity onPress={clearError} hitSlop={8}>
                  <Text style={styles.locationErrorDismiss}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <Input
              label="Address (full)"
              value={form.address}
              onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
              style={styles.inputSpaced}
            />
            <Text style={styles.cityStateIntro}>
              City and state: tap each box below and type (same as a normal form field).
            </Text>
            <View style={styles.row}>
              <View style={styles.cityStateCol}>
                <Input
                  label="City"
                  labelStyle={styles.cityStateLabel}
                  value={form.city}
                  onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
                  placeholder="e.g. Ikeja"
                  placeholderTextColor={colors.neutral[500]}
                  autoCapitalize="words"
                  style={styles.cityStateInput}
                />
              </View>
              <View style={styles.cityStateCol}>
                <Input
                  label="State"
                  labelStyle={styles.cityStateLabel}
                  value={form.state}
                  onChangeText={(t) => setForm((f) => ({ ...f, state: t }))}
                  placeholder="e.g. Lagos"
                  placeholderTextColor={colors.neutral[500]}
                  autoCapitalize="words"
                  style={styles.cityStateInput}
                />
              </View>
            </View>
            <Input label="Zip code" value={form.zipCode} onChangeText={(t) => setForm((f) => ({ ...f, zipCode: t }))} style={styles.inputSpaced} />
          </View>
          <Text style={styles.sectionLabelInline}>NIN</Text>
          <Input
            value={form.nin}
            onChangeText={(t) => setForm((f) => ({ ...f, nin: t }))}
            placeholder="National ID number"
            style={styles.inputTop}
          />
          <Text style={styles.sectionLabelInline}>Guarantor</Text>
          <View style={styles.formGroup}>
            <Input label="Name" value={form.guarantorName} onChangeText={(t) => setForm((f) => ({ ...f, guarantorName: t }))} />
            <Input
              label="Phone"
              value={form.guarantorPhone}
              onChangeText={(t) => setForm((f) => ({ ...f, guarantorPhone: t }))}
              keyboardType="phone-pad"
              style={styles.inputSpaced}
            />
            <Input
              label="Address"
              value={form.guarantorAddress}
              onChangeText={(t) => setForm((f) => ({ ...f, guarantorAddress: t }))}
              style={styles.inputSpaced}
            />
          </View>
        </CollapsibleProfileSection>

        <CollapsibleProfileSection
          title="Documents & photo"
          icon="document-text-outline"
          expanded={sectionOpen.documents}
          onToggle={() => toggleSection('documents')}
        >
          {!avatarUrl ? (
            <EmptyState
              icon="image-outline"
              title="Add a workshop photo"
              subtitle="Customers trust profiles with a clear face or logo."
            >
              <Button title="Upload photo" onPress={() => pickImage('avatar')} loading={uploadingAvatar} variant="outline" />
            </EmptyState>
          ) : (
            <View style={styles.avatarRow}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              <View style={styles.avatarActions}>
                <Button
                  title={uploadingAvatar ? 'Uploading…' : 'Change photo'}
                  onPress={() => pickImage('avatar')}
                  loading={uploadingAvatar}
                  variant="outline"
                  style={styles.avatarBtn}
                />
                <TouchableOpacity onPress={() => setAvatarUrl(null)} style={styles.textLinkBtn} hitSlop={12}>
                  <Text style={styles.textLink}>Remove photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <Text style={[styles.sectionLabelInline, { marginTop: 20 }]}>Certificate</Text>
          {!certificateUrl ? (
            <EmptyState
              icon="ribbon-outline"
              title="Upload your certificate"
              subtitle="Clear photo or screenshot, up to 5MB. Builds trust with new customers."
            >
              <Button title="Upload certificate" onPress={() => pickImage('certificate')} loading={uploadingCert} variant="outline" />
            </EmptyState>
          ) : (
            <>
              <View style={styles.certRow}>
                <TouchableOpacity onPress={() => certificateUrl && Linking.openURL(certificateUrl)}>
                  <Text style={styles.link}>View certificate</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCertificateUrl(null)} hitSlop={12}>
                  <Text style={styles.textLinkDanger}>Remove</Text>
                </TouchableOpacity>
              </View>
              <Button
                title={uploadingCert ? 'Uploading…' : 'Replace certificate'}
                onPress={() => pickImage('certificate')}
                loading={uploadingCert}
                variant="outline"
                style={styles.certBtn}
              />
            </>
          )}
        </CollapsibleProfileSection>

        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button title="Save changes" onPress={save} loading={saving} style={styles.saveBtn} />
        <Text style={styles.savedMeta}>
          {lastSavedAt
            ? `Last saved on this device ${formatSavedAt(lastSavedAt)}`
            : display.profileUpdatedAt
              ? `Server profile updated ${new Date(display.profileUpdatedAt).toLocaleString()}`
              : 'Save to sync changes with the server'}
        </Text>
      </Card>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Account</Text>
        <Text style={styles.dangerHint}>
          Need to leave the platform? You can remove your workshop profile permanently.
        </Text>
        <TouchableOpacity
          style={[styles.deleteAccountBtn, deletingAccount && { opacity: 0.6 }]}
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={[styles.deleteAccountBtnText, { marginLeft: 10 }]}>
            {deletingAccount ? 'Deleting…' : 'Delete account'}
          </Text>
        </TouchableOpacity>
      </View>

      <Button title="Sign out" onPress={() => logout()} variant="outline" style={styles.logout} />

      <Modal visible={pickerOpen !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {pickerOpen === 'vehicleTypes' ? 'Vehicle types' : pickerOpen === 'expertise' ? 'Expertise' : 'Car brands'}
            </Text>
            <FlatList
              data={
                pickerOpen === 'brands'
                  ? (CAR_BRANDS.map((b) => ({ value: b, label: b })) as Array<{ value: string; label: string }>)
                  : ((pickerOpen === 'vehicleTypes' ? MECHANIC_VEHICLE_TYPES : EXPERTISE_OPTIONS) as unknown as Array<{
                      value: string
                      label: string
                    }>)
              }
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const key = pickerOpen === 'vehicleTypes' ? 'vehicleTypes' : pickerOpen === 'expertise' ? 'expertise' : 'brands'
                const selected = (form[key] ?? []).includes(item.value)
                return (
                  <TouchableOpacity style={styles.pickerItem} onPress={() => toggleMulti(pickerOpen!, item.value)}>
                    <Text style={styles.pickerItemText}>{item.label}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary[600]} /> : null}
                  </TouchableOpacity>
                )
              }}
            />
            <Button title="Done" onPress={() => setPickerOpen(null)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingBottom: 48 },
  skBone: { backgroundColor: colors.neutral[200] },
  skBar: { height: 12, borderRadius: 6, backgroundColor: colors.neutral[200], marginBottom: 10 },
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    marginHorizontal: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroAvatarWrap: {
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  heroAvatarPlaceholder: {
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  mechanicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  mechanicChipText: { fontSize: 12, fontWeight: '700', color: colors.primary[800] },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verifiedChipText: { fontSize: 12, fontWeight: '700', color: colors.primary[800] },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pendingChipText: { fontSize: 12, fontWeight: '600', color: colors.neutral[600] },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.neutral[200] },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase' },
  saveToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
    padding: 14,
    backgroundColor: colors.primary[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  saveToastText: { fontSize: 15, fontWeight: '700', color: colors.primary[800] },
  availabilityCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  availabilityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  availabilityCopy: { flex: 1, paddingRight: 8 },
  availabilityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  availabilityHint: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  availSpinner: { marginRight: 4 },
  availabilityPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  availabilityPillOn: { backgroundColor: colors.primary[50] },
  availabilityPillOff: { backgroundColor: colors.neutral[100] },
  availabilityPillText: { fontSize: 13, fontWeight: '700' },
  availabilityPillTextOn: { color: colors.primary[700] },
  availabilityPillTextOff: { color: colors.neutral[600] },
  profileCard: { padding: 16, marginHorizontal: 20, marginTop: 12 },
  strengthBlock: { marginBottom: 8 },
  strengthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  strengthTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  strengthCount: { fontSize: 14, fontWeight: '800', color: colors.primary[700] },
  strengthBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
    marginBottom: 12,
  },
  strengthBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  strengthChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strengthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  strengthChipDone: { backgroundColor: colors.primary[50], borderColor: colors.primary[100] },
  strengthChipText: { fontSize: 12, fontWeight: '600', color: colors.neutral[600] },
  strengthChipTextDone: { color: colors.primary[800] },
  sectionLabelInline: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
    marginTop: 16,
    marginBottom: 8,
  },
  readOnlyBlock: { backgroundColor: colors.neutral[50], borderRadius: 12, padding: 14, marginBottom: 12 },
  readOnlyRow: { marginBottom: 12 },
  readOnlyRowLast: { marginBottom: 0 },
  readOnlyLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  readOnlyValue: { fontSize: 15, color: colors.text },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarActions: { flex: 1, gap: 8 },
  avatarBtn: { width: '100%' },
  textLinkBtn: { paddingVertical: 4 },
  textLink: { fontSize: 14, fontWeight: '600', color: colors.primary[600] },
  textLinkDanger: { fontSize: 14, fontWeight: '600', color: colors.accent.red },
  certRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  formGroup: { marginTop: 4 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 12 },
  inputSpaced: { marginTop: 4 },
  inputTop: { marginTop: 8 },
  bioInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 88,
    color: colors.text,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  selectChipText: { fontSize: 15, color: colors.text },
  hintText: { fontSize: 12, color: colors.neutral[500], marginTop: 4, marginBottom: 4 },
  formBtn: { marginTop: 12 },
  locationErrorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  locationErrorText: { flex: 1, fontSize: 13, color: colors.accent.red, fontFamily: fonts.regular },
  locationErrorDismiss: { fontSize: 13, color: colors.brand.primary, fontFamily: fonts.semiBold },
  row: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'stretch' },
  cityStateIntro: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 2,
  },
  cityStateCol: { flex: 1, minWidth: 0 },
  cityStateLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.brand.forest,
    marginBottom: 8,
  },
  cityStateInput: {
    minHeight: 60,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 18,
    lineHeight: 24,
    borderWidth: 2,
    borderColor: colors.primary[300],
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  link: { fontSize: 15, color: colors.primary[600], marginBottom: 10 },
  certBtn: { marginTop: 10 },
  err: { color: colors.accent.red, fontSize: 14, marginTop: 14 },
  saveBtn: { marginTop: 20 },
  savedMeta: { fontSize: 12, color: colors.neutral[500], marginTop: 10, textAlign: 'center' },
  dangerZone: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  dangerZoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[500],
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dangerHint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.red,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteAccountBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logout: { marginTop: 20, marginHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  pickerItemText: { fontSize: 16, color: colors.text },
})
