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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  bookingsAPI,
  getApiErrorMessage,
} from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { connectSocket, onQuoteEvents, onNewMessage } from '../../services/socket'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { BookingChat } from '../../components/BookingChat'

export function MechanicBookingDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [cost, setCost] = useState('')
  const [updatingCost, setUpdatingCost] = useState(false)
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const [updatingQuote, setUpdatingQuote] = useState(false)
  const [myQuote, setMyQuote] = useState<any>(null)
  const [clarificationQuestion, setClarificationQuestion] = useState('')
  const [submittingClarification, setSubmittingClarification] = useState(false)
  const currentUserId = useAuthStore((s) => s.user?.id) || ''

  const load = useCallback(async () => {
    try {
      const [bookingRes, quotesRes] = await Promise.all([
        bookingsAPI.getById(id),
        bookingsAPI.getQuotes(id).catch(() => ({ data: [] })),
      ])
      const b = bookingRes.data
      setBooking(b)
      const quotes = Array.isArray(quotesRes.data) ? quotesRes.data : []
      const mine = quotes.find((q: any) => q.mechanicId === currentUserId)
      setMyQuote(mine || null)
      if (mine && !quotePrice) {
        setQuotePrice(String(mine.proposedPrice ?? ''))
        setQuoteMessage(mine.message ?? '')
      }
    } catch (_) {}
    finally { setLoading(false) }
  }, [id, currentUserId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    connectSocket()
    const unsubQuote = onQuoteEvents((data) => { if (data.bookingId === id) load() })
    const unsubMsg = onNewMessage((data) => { if (data.bookingId === id) load() })
    return () => { unsubQuote(); unsubMsg() }
  }, [id, load])

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

  const submitQuote = async () => {
    const price = parseFloat(quotePrice)
    if (!price || price <= 0) {
      Alert.alert('Required', 'Enter a valid price')
      return
    }
    setSubmittingQuote(true)
    try {
      await bookingsAPI.createQuote(id, { proposedPrice: price, message: quoteMessage.trim() || undefined })
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSubmittingQuote(false)
    }
  }

  const updateQuote = async () => {
    const price = parseFloat(quotePrice)
    if (!price || price <= 0 || !myQuote) return
    setUpdatingQuote(true)
    try {
      await bookingsAPI.updateQuote(id, myQuote.id, { proposedPrice: price })
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setUpdatingQuote(false)
    }
  }

  const askClarification = async () => {
    if (!clarificationQuestion.trim()) return
    setSubmittingClarification(true)
    try {
      await bookingsAPI.addClarification(id, clarificationQuestion.trim())
      setClarificationQuestion('')
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSubmittingClarification(false)
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

  const status = booking.status
  const isOpenRequest = status === 'REQUESTED' && !booking.mechanicId
  const messages = booking.messages || []
  const hasLocation =
    typeof (booking.locationLat ?? booking.location?.lat) === 'number' &&
    typeof (booking.locationLng ?? booking.location?.lng) === 'number'

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.mainCard}>
          <View style={styles.heroBlock}>
            <Text style={styles.vehicle}>{booking.vehicle?.brand} {booking.vehicle?.model}</Text>
            <Text style={styles.fault}>{booking.fault?.name}</Text>
            <Text style={styles.customer}>{booking.user?.firstName} {booking.user?.lastName}</Text>
            <View style={[styles.statusChip, { backgroundColor: statusBg(status) }]}>
              <Text style={styles.statusChipText}>{status?.replace('_', ' ')}</Text>
            </View>
          </View>

          {booking.description ? (
            <>
              <Text style={styles.sectionLabel}>Job details</Text>
              <Text style={styles.descriptionText}>{booking.description}</Text>
            </>
          ) : null}

          {/* Open request: quote + clarification */}
          {isOpenRequest && (
            <>
              <Text style={styles.sectionLabel}>Your quote</Text>
              {myQuote ? (
                <View style={styles.quoteBlock}>
                  <Text style={styles.quotePrice}>₦{Number(myQuote.proposedPrice).toLocaleString()}</Text>
                  <Text style={styles.quoteStatus}>Status: {myQuote.status}</Text>
                  {myQuote.status === 'PENDING' && (
                    <>
                      <Input
                        label="Update price (₦)"
                        value={quotePrice}
                        onChangeText={setQuotePrice}
                        keyboardType="decimal-pad"
                      />
                      <Button title="Update quote" onPress={updateQuote} loading={updatingQuote} />
                    </>
                  )}
                </View>
              ) : (
                <>
                  <Input
                    label="Your price (₦)"
                    value={quotePrice}
                    onChangeText={setQuotePrice}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={styles.quoteMessageInput}
                    value={quoteMessage}
                    onChangeText={setQuoteMessage}
                    placeholder="Optional message to customer..."
                    placeholderTextColor={colors.neutral[400]}
                    multiline
                  />
                  <Button title="Submit quote" onPress={submitQuote} loading={submittingQuote} />
                </>
              )}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Ask a question</Text>
              <TextInput
                style={styles.clarificationInput}
                value={clarificationQuestion}
                onChangeText={setClarificationQuestion}
                placeholder="Ask the customer for more details..."
                placeholderTextColor={colors.neutral[400]}
                multiline
              />
              <Button title="Send question" onPress={askClarification} loading={submittingClarification} variant="outline" style={styles.formBtn} />
            </>
          )}

          {/* Assigned booking flow */}
          {status === 'REQUESTED' && booking.mechanicId && (
            <Button title="Accept booking" onPress={accept} loading={accepting} style={styles.actionBtn} />
          )}
          {status === 'ACCEPTED' && (
            <Button title="Start work" onPress={() => updateStatus('IN_PROGRESS')} loading={updatingStatus} style={styles.actionBtn} />
          )}
          {status === 'IN_PROGRESS' && (
            <Button title="Mark as done" onPress={() => updateStatus('DONE')} loading={updatingStatus} style={styles.actionBtn} />
          )}
          {(status === 'ACCEPTED' || status === 'IN_PROGRESS') && booking.estimatedCost == null && (
            <View style={styles.costRow}>
              <Input placeholder="Cost estimate (₦)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" style={styles.costInput} />
              <Button title="Set cost" onPress={setCostSubmit} loading={updatingCost} />
            </View>
          )}
          {booking.estimatedCost != null && (
            <Text style={styles.cost}>Est. ₦{Number(booking.estimatedCost).toLocaleString()}</Text>
          )}

          {/* Job location */}
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
    </View>
  )
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

function formatJobAddress(booking: any): string {
  if (booking.locationAddress && typeof booking.locationAddress === 'string') return booking.locationAddress
  const parts = [booking.locationStreet, booking.locationCity, booking.locationState].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return 'Job location'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  mainCard: { padding: 20 },
  heroBlock: { marginBottom: 4 },
  vehicle: { fontSize: 20, fontWeight: '700', color: colors.text },
  fault: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  customer: { fontSize: 14, color: colors.primary[600], marginTop: 6 },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  statusChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
    letterSpacing: 0.4,
    marginTop: 24,
    marginBottom: 10,
  },
  descriptionText: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  quoteBlock: { marginTop: 4 },
  quotePrice: { fontSize: 19, fontWeight: '700', color: colors.primary[600] },
  quoteStatus: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  quoteForm: { marginTop: 12 },
  formBtn: { marginTop: 14 },
  quoteMessageInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 72,
    marginTop: 10,
    color: colors.text,
  },
  clarificationInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 72,
    marginBottom: 10,
    color: colors.text,
  },
  actionBtn: { marginTop: 20 },
  costRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 16 },
  costInput: { flex: 1, marginBottom: 0 },
  cost: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 12 },
  locationBlock: { marginTop: 4 },
  locationAddress: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mapLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  chatSection: { marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
})
