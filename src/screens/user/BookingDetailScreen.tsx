import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  bookingsAPI,
  ratingsAPI,
  walletAPI,
  getApiErrorMessage,
} from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { connectSocket, onQuoteEvents, onNewMessage } from '../../services/socket'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { BookingChat } from '../../components/BookingChat'

const PAYMENT_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'DONE']

export function BookingDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params
  const [booking, setBooking] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null)
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [markingDirect, setMarkingDirect] = useState(false)
  const [answeringClarificationId, setAnsweringClarificationId] = useState<string | null>(null)
  const [clarificationAnswer, setClarificationAnswer] = useState('')
  const currentUserId = useAuthStore((s) => s.user?.id) || ''

  const load = useCallback(async () => {
    try {
      const [bookingRes, quotesRes] = await Promise.all([
        bookingsAPI.getById(id),
        bookingsAPI.getQuotes(id).catch(() => ({ data: [] })),
      ])
      setBooking(bookingRes.data)
      setQuotes(Array.isArray(quotesRes.data) ? quotesRes.data : [])
    } catch (_) {}
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    connectSocket()
    const unsubQuote = onQuoteEvents((data) => {
      if (data.bookingId === id) load()
    })
    const unsubMsg = onNewMessage((data) => {
      if (data.bookingId === id) load()
    })
    return () => {
      unsubQuote()
      unsubMsg()
    }
  }, [id, load])

  useEffect(() => {
    if (booking) setDescriptionDraft(booking.description ?? '')
  }, [booking?.description])

  const submitRating = async () => {
    if (!rating || !booking?.mechanic) return
    setSubmittingRating(true)
    try {
      await ratingsAPI.create({
        bookingId: booking.id,
        mechanicId: booking.mechanic.id,
        rating,
        comment,
      })
      setShowRating(false)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSubmittingRating(false)
    }
  }

  const saveDescription = async () => {
    setSavingDescription(true)
    try {
      await bookingsAPI.updateDescription(id, descriptionDraft.trim() || null)
      setBooking((b: any) => (b ? { ...b, description: descriptionDraft.trim() || null } : b))
      setEditingDescription(false)
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSavingDescription(false)
    }
  }

  const acceptQuote = async (quoteId: string) => {
    setAcceptingQuoteId(quoteId)
    try {
      await bookingsAPI.acceptQuote(id, quoteId)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setAcceptingQuoteId(null)
    }
  }

  const rejectQuote = async (quoteId: string) => {
    setRejectingQuoteId(quoteId)
    try {
      await bookingsAPI.rejectQuote(id, quoteId)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setRejectingQuoteId(null)
    }
  }

  const payWithPaystack = async () => {
    setPaying(true)
    try {
      const res = await walletAPI.initializePayment(id)
      const url = res.data?.authorizationUrl
      if (url) await Linking.openURL(url)
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setPaying(false)
    }
  }

  const markDirectPaid = async () => {
    setMarkingDirect(true)
    try {
      await walletAPI.markDirectPaid(id)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setMarkingDirect(false)
    }
  }

  const submitClarificationAnswer = async (clarificationId: string) => {
    if (!clarificationAnswer.trim()) return
    setAnsweringClarificationId(clarificationId)
    try {
      await bookingsAPI.answerClarification(clarificationId, clarificationAnswer.trim())
      setClarificationAnswer('')
      setAnsweringClarificationId(null)
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
      setAnsweringClarificationId(null)
    }
  }

  const openMap = () => {
    const lat = booking?.locationLat ?? booking?.location?.lat
    const lng = booking?.locationLng ?? booking?.location?.lng
    if (typeof lat === 'number' && typeof lng === 'number') {
      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
    }
  }

  if (loading || !booking) return <LoadingOverlay />

  const messages = booking.messages || []
  const clarifications = booking.clarifications || []
  const pendingQuotes = quotes.filter((q: any) => q.status === 'PENDING')
  const canPay =
    PAYMENT_STATUSES.includes(booking.status) &&
    !booking.paidAt &&
    (booking.estimatedCost ?? 0) > 0
  const hasLocation =
    typeof (booking.locationLat ?? booking.location?.lat) === 'number' &&
    typeof (booking.locationLng ?? booking.location?.lng) === 'number'

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.mainCard}>
          <View style={styles.heroBlock}>
            <Text style={styles.vehicle}>
              {booking.vehicle?.brand} {booking.vehicle?.model}
            </Text>
            <Text style={styles.fault}>{booking.fault?.name}</Text>
            <View style={[styles.statusChip, { backgroundColor: statusBg(booking.status) }]}>
              <Text style={styles.statusChipText}>{booking.status?.replace('_', ' ')}</Text>
            </View>
            {booking.estimatedCost != null && (
              <Text style={styles.cost}>Est. ₦{Number(booking.estimatedCost).toLocaleString()}</Text>
            )}
            {booking.mechanic && (
              <Text style={styles.mech}>
                {booking.mechanic.companyName} · {booking.mechanic.ownerFullName}
              </Text>
            )}
          </View>

          {/* Job details / description */}
          <Text style={styles.sectionLabel}>Job details</Text>
          {editingDescription ? (
            <>
              <TextInput
                style={styles.descriptionInput}
                value={descriptionDraft}
                onChangeText={setDescriptionDraft}
                placeholder="Describe the issue for mechanics..."
                placeholderTextColor={colors.neutral[400]}
                multiline
              />
              <View style={styles.row}>
                <Button title="Save" onPress={saveDescription} loading={savingDescription} />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setEditingDescription(false)
                    setDescriptionDraft(booking.description ?? '')
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.descriptionText}>
                {booking.description || 'No description added.'}
              </Text>
              <TouchableOpacity onPress={() => setEditingDescription(true)}>
                <Text style={styles.editLink}>Edit description</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Quotes (open request) */}
          {booking.status === 'REQUESTED' && !booking.mechanicId && pendingQuotes.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Quotes from mechanics</Text>
              {pendingQuotes.map((q: any) => (
                <View key={q.id} style={styles.quoteCard}>
                  <Text style={styles.quoteMech}>{q.mechanic?.companyName ?? 'Mechanic'}</Text>
                  <Text style={styles.quotePrice}>₦{Number(q.proposedPrice).toLocaleString()}</Text>
                  {q.message ? (
                    <Text style={styles.quoteMessage}>{q.message}</Text>
                  ) : null}
                  <View style={styles.quoteActions}>
                    <Button
                      title="Accept"
                      onPress={() => acceptQuote(q.id)}
                      loading={acceptingQuoteId === q.id}
                      style={styles.quoteBtn}
                    />
                    <Button
                      title="Reject"
                      variant="outline"
                      onPress={() => rejectQuote(q.id)}
                      loading={rejectingQuoteId === q.id}
                      style={styles.quoteBtn}
                    />
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Clarifications */}
          {clarifications.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Q&A</Text>
              {clarifications.map((c: any) => (
                <View key={c.id} style={styles.clarificationCard}>
                  <View style={styles.clarificationCardInner}>
                  <Text style={styles.clarificationQ}>{c.question}</Text>
                  {c.answer ? (
                    <Text style={styles.clarificationA}>{c.answer}</Text>
                  ) : answeringClarificationId === c.id ? (
                    <View style={styles.answerRow}>
                      <TextInput
                        style={styles.answerInput}
                        value={clarificationAnswer}
                        onChangeText={setClarificationAnswer}
                        placeholder="Your answer..."
                        placeholderTextColor={colors.neutral[400]}
                      />
                      <Button
                        title="Send"
                        onPress={() => submitClarificationAnswer(c.id)}
                        loading={answeringClarificationId === c.id}
                      />
                    </View>
                  ) : (
                    <Button
                      title="Answer"
                      variant="outline"
                      onPress={() => setAnsweringClarificationId(c.id)}
                    />
                  )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Payment */}
          {canPay && (
            <>
              <Text style={styles.sectionLabel}>Payment</Text>
              <View style={styles.paymentRow}>
                <Button
                  title="Pay with Paystack"
                  onPress={payWithPaystack}
                  loading={paying}
                  style={styles.paymentBtn}
                />
                <Button
                  title="I paid mechanic directly"
                  variant="outline"
                  onPress={markDirectPaid}
                  loading={markingDirect}
                  style={styles.paymentBtn}
                />
              </View>
            </>
          )}

          {/* Location */}
          {hasLocation && (
            <>
              <Text style={styles.sectionLabel}>Job location</Text>
              <View style={styles.locationBlock}>
                <Text style={styles.locationAddress} numberOfLines={4}>
                  {formatJobAddress(booking)}
                </Text>
                <TouchableOpacity style={styles.mapLink} onPress={openMap}>
                  <Ionicons name="map" size={20} color={colors.primary[600]} />
                  <Text style={styles.mapLinkText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {booking.status === 'DONE' && !showRating && (
            <Button
              title="Rate mechanic"
              onPress={() => setShowRating(true)}
              variant="secondary"
              style={styles.rateBtn}
            />
          )}
        </Card>

        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>Chat</Text>
          <BookingChat
          bookingId={id}
          messages={messages}
          onMessagesChange={(next) => setBooking((b: any) => (b ? { ...b, messages: next } : b))}
        />
        </View>
      </ScrollView>

      {showRating && (
        <View style={styles.ratingModal}>
          <Card style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate this mechanic</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRating(s)}
                  style={styles.star}
                >
                  <Ionicons
                    name={s <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={colors.accent.amber}
                  />
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
            <Button
              title="Cancel"
              onPress={() => setShowRating(false)}
              variant="outline"
              style={styles.cancelBtn}
            />
          </Card>
        </View>
      )}
    </View>
  )
}

function formatJobAddress(booking: any): string {
  if (booking.locationAddress && typeof booking.locationAddress === 'string') return booking.locationAddress
  const parts = [booking.locationStreet, booking.locationCity, booking.locationState].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return 'Job location'
}

function statusBg(status: string): string {
  switch (status) {
    case 'DONE':
    case 'PAID':
    case 'DELIVERED':
      return colors.accent.green + '22'
    case 'IN_PROGRESS':
    case 'ACCEPTED':
      return colors.primary[100]
    default:
      return colors.neutral[200]
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  mainCard: { padding: 20 },
  heroBlock: { marginBottom: 4 },
  vehicle: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: 0.2 },
  fault: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  statusChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  cost: { fontSize: 17, fontWeight: '700', color: colors.primary[600], marginTop: 10 },
  mech: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
    letterSpacing: 0.4,
    marginTop: 24,
    marginBottom: 10,
  },
  descriptionText: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  descriptionInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 88,
    color: colors.text,
  },
  editLink: { fontSize: 14, color: colors.primary[600], marginTop: 10 },
  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quoteCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  quoteCardInner: { gap: 2 },
  quoteMech: { fontSize: 16, fontWeight: '600', color: colors.text },
  quotePrice: { fontSize: 19, fontWeight: '700', color: colors.primary[600], marginTop: 8 },
  quoteMessage: { fontSize: 14, color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
  quoteActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quoteBtn: { flex: 1 },
  clarificationCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  clarificationCardInner: {},
  clarificationQ: { fontSize: 15, fontWeight: '600', color: colors.text },
  clarificationA: { fontSize: 14, color: colors.textSecondary, marginTop: 10, lineHeight: 21 },
  answerRow: { marginTop: 12 },
  answerInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
    color: colors.text,
  },
  paymentRow: { flexDirection: 'row', gap: 12 },
  paymentBtn: { flex: 1 },
  locationBlock: { marginTop: 4 },
  locationAddress: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mapLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  rateBtn: { marginTop: 20 },
  chatSection: { marginTop: 28 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 88,
    marginBottom: 14,
    color: colors.text,
  },
  ratingModal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  ratingCard: { padding: 24, marginHorizontal: 20 },
  ratingTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  star: { padding: 4 },
  cancelBtn: { marginTop: 12 },
})
