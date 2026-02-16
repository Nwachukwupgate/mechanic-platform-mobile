import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import {
  mechanicsAPI,
  getApiErrorMessage,
  isPropertyNotAllowedError,
} from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useCurrentLocation } from '../../utils/location'
import { reverseGeocode } from '../../services/geocoding'
import { MECHANIC_VEHICLE_TYPES, EXPERTISE_OPTIONS } from '../../constants/mechanic'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function MechanicProfileScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [pickerOpen, setPickerOpen] = useState<'vehicleTypes' | 'expertise' | null>(null)
  const [pickerValue, setPickerValue] = useState<string[]>([])
  const { getLocation, locationState } = useCurrentLocation()
  const [locationRequested, setLocationRequested] = useState(false)

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
  })

  useEffect(() => {
    mechanicsAPI
      .getProfile()
      .then((res) => {
        const p = res.data
        setProfile(p)
        setForm({
          phone: p?.phone ?? '',
          experience: p?.experience ?? '',
          bio: p?.bio ?? '',
          workshopAddress: p?.workshopAddress ?? '',
          workshopLat: p?.workshopLat ?? null,
          workshopLng: p?.workshopLng ?? null,
          address: p?.address ?? '',
          city: p?.city ?? '',
          state: p?.state ?? '',
          zipCode: p?.zipCode ?? '',
          nin: p?.nin ?? '',
          guarantorName: p?.guarantorName ?? '',
          guarantorPhone: p?.guarantorPhone ?? '',
          guarantorAddress: p?.guarantorAddress ?? '',
          vehicleTypes: Array.isArray(p?.vehicleTypes) ? p.vehicleTypes : [],
          expertise: Array.isArray(p?.expertise) ? p.expertise : [],
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pickImage = async (type: 'avatar' | 'certificate') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to upload.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'certificate' ? ['images', 'pdf'] as any : ['images'],
      allowsEditing: type === 'avatar',
      aspect: type === 'avatar' ? [1, 1] : undefined,
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const uri = asset.uri
    const name = uri.split('/').pop() || (type === 'avatar' ? 'avatar.jpg' : 'certificate.jpg')
    const file = { uri, name, type: asset.mimeType || 'image/jpeg' }
    if (type === 'avatar') {
      setUploadingAvatar(true)
      try {
        const res = await mechanicsAPI.uploadAvatar(file as any)
        if (res.data?.avatarUrl) setProfile((p: any) => (p ? { ...p, avatarUrl: res.data.avatarUrl } : p))
      } catch (e: any) {
        Alert.alert('Error', getApiErrorMessage(e))
      } finally {
        setUploadingAvatar(false)
      }
    } else {
      setUploadingCert(true)
      try {
        const res = await mechanicsAPI.uploadCertificate(file as any)
        if (res.data?.certificateUrl) setProfile((p: any) => (p ? { ...p, certificateUrl: res.data.certificateUrl } : p))
      } catch (e: any) {
        Alert.alert('Error', getApiErrorMessage(e))
      } finally {
        setUploadingCert(false)
      }
    }
  }

  const useMyLocation = () => {
    setLocationRequested(true)
    getLocation()
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
    return () => { cancelled = true }
  }, [locationRequested, locationState.lat, locationState.lng])

  const save = async () => {
    setError('')
    setSaving(true)
    const payload: any = {
      phone: form.phone.trim() || undefined,
      experience: form.experience.trim() || undefined,
      bio: form.bio.trim() || undefined,
      workshopAddress: form.workshopAddress.trim() || undefined,
      workshopLat: form.workshopLat ?? undefined,
      workshopLng: form.workshopLng ?? undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zipCode: form.zipCode.trim() || undefined,
      nin: form.nin.trim() || undefined,
      guarantorName: form.guarantorName.trim() || undefined,
      guarantorPhone: form.guarantorPhone.trim() || undefined,
      guarantorAddress: form.guarantorAddress.trim() || undefined,
      vehicleTypes: form.vehicleTypes.length ? form.vehicleTypes : undefined,
      expertise: form.expertise.length ? form.expertise : undefined,
    }
    try {
      await mechanicsAPI.updateProfile(payload)
      setProfile((p: any) => (p ? { ...p, ...payload } : p))
    } catch (e: any) {
      if (isPropertyNotAllowedError(e, 'brands')) {
        const withoutBrands = { ...payload }; delete withoutBrands.brands
        try {
          await mechanicsAPI.updateProfile(withoutBrands)
          setProfile((p: any) => (p ? { ...p, ...withoutBrands } : p))
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

  const toggleAvailability = async () => {
    const next = !profile?.availability
    setToggling(true)
    try {
      await mechanicsAPI.updateAvailability(next)
      setProfile((p: any) => (p ? { ...p, availability: next } : p))
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setToggling(false)
    }
  }

  const toggleMulti = (key: 'vehicleTypes' | 'expertise', value: string) => {
    setForm((f) => {
      const arr = f[key]
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
      return { ...f, [key]: next }
    })
  }

  if (loading) return <LoadingOverlay />

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.sectionLabel}>Photo</Text>
        <View style={styles.avatarRow}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={colors.neutral[500]} />
            </View>
          )}
          <Button
            title={uploadingAvatar ? 'Uploading…' : 'Upload photo'}
            onPress={() => pickImage('avatar')}
            loading={uploadingAvatar}
            variant="outline"
            style={styles.avatarBtn}
          />
        </View>

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

        <Input label="Phone" value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} />
        <Input label="Years of experience" value={form.experience} onChangeText={(t) => setForm((f) => ({ ...f, experience: t }))} keyboardType="number-pad" />
        <Text style={styles.inputLabel}>Bio</Text>
        <TextInput
          style={styles.bioInput}
          value={form.bio}
          onChangeText={(t) => setForm((f) => ({ ...f, bio: t }))}
          placeholder="Short description of your workshop..."
          placeholderTextColor={colors.neutral[400]}
          multiline
        />

        <Text style={styles.sectionLabel}>Vehicle types you service</Text>
        <TouchableOpacity style={styles.selectChip} onPress={() => { setPickerOpen('vehicleTypes'); setPickerValue(form.vehicleTypes); }}>
          <Text style={styles.selectChipText}>
            {form.vehicleTypes.length ? form.vehicleTypes.join(', ') : 'Select'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.neutral[500]} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Expertise</Text>
        <TouchableOpacity style={styles.selectChip} onPress={() => { setPickerOpen('expertise'); setPickerValue(form.expertise); }}>
          <Text style={styles.selectChipText}>
            {form.expertise.length ? form.expertise.join(', ') : 'Select'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.neutral[500]} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Workshop location</Text>
        <Input
          label="Address"
          value={form.workshopAddress}
          onChangeText={(t) => setForm((f) => ({ ...f, workshopAddress: t }))}
          placeholder="Or use button below"
        />
        <Button title="Use my location" onPress={useMyLocation} variant="outline" />

        <Input label="Address (full)" value={form.address} onChangeText={(t) => setForm((f) => ({ ...f, address: t }))} />
        <View style={styles.row}>
          <Input label="City" value={form.city} onChangeText={(t) => setForm((f) => ({ ...f, city: t }))} style={styles.half} />
          <Input label="State" value={form.state} onChangeText={(t) => setForm((f) => ({ ...f, state: t }))} style={styles.half} />
        </View>
        <Input label="Zip code" value={form.zipCode} onChangeText={(t) => setForm((f) => ({ ...f, zipCode: t }))} />

        <Text style={styles.sectionLabel}>NIN</Text>
        <Input value={form.nin} onChangeText={(t) => setForm((f) => ({ ...f, nin: t }))} placeholder="National ID number" />

        <Text style={styles.sectionLabel}>Guarantor</Text>
        <Input label="Name" value={form.guarantorName} onChangeText={(t) => setForm((f) => ({ ...f, guarantorName: t }))} />
        <Input label="Phone" value={form.guarantorPhone} onChangeText={(t) => setForm((f) => ({ ...f, guarantorPhone: t }))} keyboardType="phone-pad" />
        <Input label="Address" value={form.guarantorAddress} onChangeText={(t) => setForm((f) => ({ ...f, guarantorAddress: t }))} />

        <Text style={styles.sectionLabel}>Certificate</Text>
        {profile?.certificateUrl ? (
          <TouchableOpacity onPress={() => profile.certificateUrl && Linking.openURL(profile.certificateUrl)}>
            <Text style={styles.link}>View certificate</Text>
          </TouchableOpacity>
        ) : null}
        <Button
          title={uploadingCert ? 'Uploading…' : 'Upload certificate'}
          onPress={() => pickImage('certificate')}
          loading={uploadingCert}
          variant="outline"
          style={styles.certBtn}
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button title="Save changes" onPress={save} loading={saving} />
      </Card>
      <Button title="Sign out" onPress={() => logout()} variant="outline" style={styles.logout} />

      <Modal visible={pickerOpen !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{pickerOpen === 'vehicleTypes' ? 'Vehicle types' : 'Expertise'}</Text>
            <FlatList
              data={(pickerOpen === 'vehicleTypes' ? MECHANIC_VEHICLE_TYPES : EXPERTISE_OPTIONS) as unknown as Array<{ value: string; label: string }>}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const selected = form[pickerOpen === 'vehicleTypes' ? 'vehicleTypes' : 'expertise'].includes(item.value)
                return (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => toggleMulti(pickerOpen!, item.value)}
                  >
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
  container: { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  availLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  availBtn: { minWidth: 120 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6 },
  bioInput: { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, color: colors.text },
  selectChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12, padding: 14, marginTop: 8 },
  selectChipText: { fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  link: { fontSize: 15, color: colors.primary[600], marginBottom: 8 },
  certBtn: { marginTop: 8 },
  err: { color: colors.accent.red, fontSize: 14, marginTop: 12 },
  logout: { marginTop: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 20, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  pickerItemText: { fontSize: 16, color: colors.text },
})
