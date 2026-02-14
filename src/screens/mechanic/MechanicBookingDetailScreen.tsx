import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function MechanicBookingDetailScreen({ route }: { route: any }) {
  const { id } = route.params
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [cost, setCost] = useState('')
  const [updatingCost, setUpdatingCost] = useState(false)
  const currentUserId = useAuthStore((s) => s.user?.id) || ''

  const load = async () => {
    try {
      const res = await bookingsAPI.getById(id)
      setBooking(res.data)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const accept = async () => {
    setAccepting(true)
    try {
      await bookingsAPI.acceptBooking(id)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setAccepting(false)
    }
  }

  const updateStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      await bookingsAPI.updateStatus(id, status)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const setCostSubmit = async () => {
    const num = parseFloat(cost)
    if (!num || num <= 0) return
    setUpdatingCost(true)
    try {
      await bookingsAPI.updateCost(id, num)
      setCost('')
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setUpdatingCost(false)
    }
  }

  if (loading || !booking) return <LoadingOverlay />

  const messages = booking.messages || []
  const status = booking.status

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.vehicle}>{booking.vehicle?.brand} {booking.vehicle?.model}</Text>
        <Text style={styles.fault}>{booking.fault?.name}</Text>
        <Text style={styles.customer}>{booking.user?.firstName} {booking.user?.lastName}</Text>
        <View style={styles.statusWrap}>
          <Text style={styles.status}>{status?.replace('_', ' ')}</Text>
        </View>
        {status === 'REQUESTED' && (
          <Button title="Accept booking" onPress={accept} loading={accepting} style={styles.btn} />
        )}
        {status === 'ACCEPTED' && (
          <Button title="Start work" onPress={() => updateStatus('IN_PROGRESS')} loading={updatingStatus} style={styles.btn} />
        )}
        {status === 'IN_PROGRESS' && (
          <Button title="Mark as done" onPress={() => updateStatus('DONE')} loading={updatingStatus} style={styles.btn} />
        )}
        {(status === 'ACCEPTED' || status === 'IN_PROGRESS') && booking.estimatedCost == null && (
          <View style={styles.costRow}>
            <Input placeholder="Cost estimate" value={cost} onChangeText={setCost} keyboardType="decimal-pad" style={styles.costInput} />
            <Button title="Set cost" onPress={setCostSubmit} loading={updatingCost} />
          </View>
        )}
        {booking.estimatedCost != null && (
          <Text style={styles.cost}>Est. ₦{Number(booking.estimatedCost).toLocaleString()}</Text>
        )}
      </Card>
      <Text style={styles.sectionTitle}>Chat</Text>
      {messages.map((msg: any) => (
        <View
          key={msg.id}
          style={[styles.bubble, msg.senderId === currentUserId ? styles.bubbleRight : styles.bubbleLeft]}
        >
          <Text style={styles.bubbleText}>{msg.content}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  vehicle: { fontSize: 18, fontWeight: '600', color: colors.text },
  fault: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  customer: { fontSize: 14, color: colors.primary[600], marginTop: 4 },
  statusWrap: { marginTop: 8 },
  status: { fontSize: 12, color: colors.primary[600], fontWeight: '600' },
  btn: { marginTop: 12 },
  costRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 12 },
  costInput: { flex: 1, marginBottom: 0 },
  cost: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 8 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: colors.neutral[100] },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: colors.primary[100] },
  bubbleText: { fontSize: 15, color: colors.text },
})
