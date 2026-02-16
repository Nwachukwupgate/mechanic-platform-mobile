import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { vehiclesAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
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

  React.useEffect(() => { load() }, [load])

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
          >
            <Ionicons name="add-circle" size={24} color={colors.primary[600]} />
            <Text style={styles.addBtnText}>Add vehicle</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyText}>No vehicles</Text>
            <Text style={styles.emptySub}>Add a vehicle to find mechanics for it.</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.getParent()?.navigate('VehicleForm', {})}
            >
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
              >
                <Text style={styles.vehicle}>{item.brand} {item.model}</Text>
                <Text style={styles.meta}>
                  {item.type} · {item.year}
                  {item.color ? ` · ${item.color}` : ''}
                  {item.licensePlate ? ` · ${item.licensePlate}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteVehicle(item.id)}>
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
    gap: 8,
    marginBottom: 16,
    paddingVertical: 12,
  },
  addBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary[600] },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardMain: { flex: 1 },
  vehicle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  emptyAddBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary[100], borderRadius: 12 },
  emptyAddBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary[700] },
})
