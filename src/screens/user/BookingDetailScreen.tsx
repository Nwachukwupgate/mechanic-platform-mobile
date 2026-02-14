import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { bookingsAPI, ratingsAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'

export function BookingDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const currentUserId = useAuthStore((s) => s.user?.id) || ''

  const load = async () => {
    try {
      const res = await bookingsAPI.getById(id)
      setBooking(res.data)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const submitRating = async () => {
    if (!rating || !booking?.mechanic) return
    setSubmittingRating(true)
    try {
      await ratingsAPI.create({ bookingId: booking.id, mechanicId: booking.mechanic.id, rating, comment })
      setShowRating(false)
      load()
    } catch (e: any) {
      alert(getApiErrorMessage(e))
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading || !booking) return <LoadingOverlay />

  const messages = booking.messages || []
  const otherName = booking.mechanic?.companyName ?? 'Mechanic'

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={styles.vehicle}>{booking.vehicle?.brand} {booking.vehicle?.model}</Text>
          <Text style={styles.fault}>{booking.fault?.name}</Text>
          <View style={styles.statusWrap}>
            <Text style={styles.status}>{booking.status?.replace('_', ' ')}</Text>
          </View>
          {booking.mechanic && (
            <Text style={styles.mech}>{booking.mechanic.companyName} · {booking.mechanic.ownerFullName}</Text>
          )}
          {booking.status === 'DONE' && !showRating && (
            <Button title="Rate mechanic" onPress={() => setShowRating(true)} variant="secondary" style={styles.rateBtn} />
          )}
        </Card>
        <Text style={styles.sectionTitle}>Chat</Text>
        {messages.length === 0 ? (
          <Text style={styles.noMessages}>No messages yet.</Text>
        ) : (
          messages.map((msg: any) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.senderId === currentUserId ? styles.bubbleRight : styles.bubbleLeft]}
            >
              <Text style={styles.bubbleText}>{msg.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
      {showRating && (
        <View style={styles.ratingModal}>
          <Card>
            <Text style={styles.ratingTitle}>Rate this mechanic</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.star}>
                  <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={36} color={colors.accent.amber} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Comment (optional)"
              value={comment}
              onChangeText={setComment}
              style={styles.commentInput}
              multiline
            />
            <Button title="Submit" onPress={submitRating} loading={submittingRating} />
            <Button title="Cancel" onPress={() => setShowRating(false)} variant="outline" style={styles.cancelBtn} />
          </Card>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  vehicle: { fontSize: 18, fontWeight: '600', color: colors.text },
  fault: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  statusWrap: { marginTop: 8 },
  status: { fontSize: 12, color: colors.primary[600], fontWeight: '600' },
  mech: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  rateBtn: { marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 8 },
  noMessages: { fontSize: 14, color: colors.textSecondary },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: colors.neutral[100] },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: colors.primary[100] },
  bubbleText: { fontSize: 15, color: colors.text },
  ratingModal: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  ratingTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star: { padding: 4 },
  commentInput: { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12, padding: 12, fontSize: 16, minHeight: 80, marginBottom: 12 },
  cancelBtn: { marginTop: 8 },
})
