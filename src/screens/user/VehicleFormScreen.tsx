import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, getApiErrorMessage } from '../../services/api'
import { VEHICLE_TYPES, CAR_BRANDS } from '../../constants/vehicles'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'

type RouteParams = { vehicleId?: string }

export function VehicleFormScreen() {
  const route = useRoute()
  const navigation = useNavigation<any>()
  const { vehicleId } = (route.params || {}) as RouteParams
  const isEdit = Boolean(vehicleId)

  const [type, setType] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState<'type' | 'brand' | null>(null)

  useEffect(() => {
    if (!vehicleId) return
    vehiclesAPI
      .getById(vehicleId)
      .then((res) => {
        const v = res.data
        if (v) {
          setType(v.type ?? '')
          setBrand(v.brand ?? '')
          setModel(v.model ?? '')
          setYear(String(v.year ?? ''))
          setColor(v.color ?? '')
          setLicensePlate(v.licensePlate ?? '')
        }
      })
      .catch(() => setError('Could not load vehicle'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const validate = (): boolean => {
    if (!type.trim()) {
      setError('Please select vehicle type')
      return false
    }
    if (!brand.trim()) {
      setError('Please select brand')
      return false
    }
    if (!model.trim()) {
      setError('Please enter model')
      return false
    }
    const y = parseInt(year, 10)
    if (!year.trim() || isNaN(y) || y < 1900 || y > new Date().getFullYear() + 1) {
      setError('Please enter a valid year (1900–' + (new Date().getFullYear() + 1) + ')')
      return false
    }
    setError('')
    return true
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        type: type.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year.trim(), 10),
        color: color.trim() || undefined,
        licensePlate: licensePlate.trim() || undefined,
      }
      if (isEdit) {
        await vehiclesAPI.update(vehicleId!, payload)
        navigation.goBack()
      } else {
        await vehiclesAPI.create(payload)
        navigation.goBack()
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to save vehicle'))
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = VEHICLE_TYPES.find((t) => t.value === type)?.label ?? 'Select type'
  const brandLabel = brand || 'Select brand'

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.label}>Vehicle type</Text>
          <TouchableOpacity
            style={styles.select}
            onPress={() => setPickerOpen('type')}
          >
            <Text style={styles.selectText}>{typeLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.neutral[500]} />
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 16 }]}>Brand</Text>
          <TouchableOpacity
            style={styles.select}
            onPress={() => setPickerOpen('brand')}
          >
            <Text style={styles.selectText}>{brandLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.neutral[500]} />
          </TouchableOpacity>

          <Input
            label="Model"
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Camry"
          />
          <Input
            label="Year"
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            placeholder="e.g. 2020"
          />
          <Input
            label="Color (optional)"
            value={color}
            onChangeText={setColor}
            placeholder="e.g. Black"
          />
          <Input
            label="License plate (optional)"
            value={licensePlate}
            onChangeText={setLicensePlate}
            autoCapitalize="characters"
            placeholder="e.g. ABC 123 XY"
          />

          {error ? <Text style={styles.errText}>{error}</Text> : null}
          <Button
            title={isEdit ? 'Save changes' : 'Add vehicle'}
            onPress={save}
            loading={saving}
            style={styles.saveBtn}
          />
        </Card>
      </ScrollView>

      <Modal visible={pickerOpen !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {pickerOpen === 'type' ? 'Vehicle type' : 'Brand'}
            </Text>
            <FlatList
              data={pickerOpen === 'type' ? VEHICLE_TYPES : CAR_BRANDS.map((b) => ({ value: b, label: b }))}
              keyExtractor={(item) => (item as { value: string }).value}
              renderItem={({ item }) => {
                const v = (item as { value: string; label: string }).value
                const label = (item as { value: string; label: string }).label
                const selected = pickerOpen === 'type' ? type === v : brand === v
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, selected && styles.pickerItemActive]}
                    onPress={() => {
                      if (pickerOpen === 'type') setType(v)
                      else setBrand(v)
                      setPickerOpen(null)
                    }}
                  >
                    <Text style={[styles.pickerItemText, selected && styles.pickerItemTextActive]}>
                      {label}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={22} color={colors.primary[600]} />
                    ) : null}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: colors.surface,
  },
  selectText: { fontSize: 16, color: colors.text },
  errText: { color: colors.accent.red, fontSize: 14, marginBottom: 12 },
  saveBtn: { marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  pickerItemActive: { backgroundColor: colors.primary[50] },
  pickerItemText: { fontSize: 16, color: colors.text },
  pickerItemTextActive: { fontWeight: '600', color: colors.primary[700] },
})
