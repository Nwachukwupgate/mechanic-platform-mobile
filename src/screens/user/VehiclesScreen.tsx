import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { IconBadge } from '../../components/IconBadge'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function VehiclesScreen({ navigation }: { navigation: any }) {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await vehiclesAPI.getAll()
      setList(res.data || [])
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const deleteVehicle = (id: string) => {
    Alert.alert('Remove vehicle', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehiclesAPI.delete(id)
            load()
          } catch (e: any) {
            Alert.alert('Error', getApiErrorMessage(e))
          }
        },
      },
    ])
  }

  if (loading) return <LoadingOverlay />

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.getParent()?.navigate('VehicleForm', {})}
            activeOpacity={0.8}
          >
            <View style={styles.addBtnIconWrap}>
              <Ionicons name="add" size={24} color={colors.primary[600]} />
            </View>
            <Text style={styles.addBtnText}>Add vehicle</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="car-outline" size={48} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyText}>No vehicles</Text>
            <Text style={styles.emptySub}>Add a vehicle to find mechanics for it.</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.getParent()?.navigate('VehicleForm', {})}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.emptyAddBtnText}>Add your first vehicle</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.getParent()?.navigate('VehicleForm', { vehicleId: item.id })}
                activeOpacity={0.8}
              >
                <IconBadge name="car-sport" size={22} color={colors.primary[600]} backgroundColor={colors.primary[50]} style={styles.vehicleIcon} />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicle} numberOfLines={2}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={styles.meta} numberOfLines={3}>
                    {item.type} · {item.year}
                    {item.color ? ` · ${item.color}` : ''}
                    {item.licensePlate ? ` · ${item.licensePlate}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteVehicle(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Remove vehicle"
              >
                <Ionicons name="trash-outline" size={22} color={colors.accent.red} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  addBtnIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary[600] },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', minWidth: 0 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
  vehicleInfo: { marginLeft: 14, flex: 1, minWidth: 0 },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  deleteBtn: { padding: 8, marginLeft: 8, flexShrink: 0, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 20 },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: colors.primary[100], borderRadius: 14 },
  emptyAddBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary[700] },
})
