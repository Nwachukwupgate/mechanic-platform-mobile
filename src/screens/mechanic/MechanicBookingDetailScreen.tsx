import React, { useState, useEffect, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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
import { connectSocket, onQuoteEvents, onNewMessage, onBookingStatusChanged } from '../../services/socket'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { bookingStatusBadgeColors, bookingStatusLabel } from '../../utils/bookingStatusBadge'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { BookingChat } from '../../components/BookingChat'
import { BookingDetailAccordion } from '../../components/bookingDetail/BookingDetailAccordion'
import { BookingDetailProgressSteps } from '../../components/bookingDetail/BookingDetailProgressSteps'
import { BookingHeroDecor } from '../../components/bookingDetail/BookingHeroDecor'
import { BookingPhotoGallery } from '../../components/bookingDetail/BookingPhotoGallery'

export function MechanicBookingDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const id =
    route?.params != null && route.params.id != null && route.params.id !== ''
      ? String(route.params.id)
      : ''
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
  const [jobWorkExpanded, setJobWorkExpanded] = useState(true)
  const [quoteAccordionExpanded, setQuoteAccordionExpanded] = useState(true)
  const [locationExpanded, setLocationExpanded] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(true)
  const currentUserId = useAuthStore((s) => s.user?.id) || ''

  useEffect(() => {
    setJobWorkExpanded(true)
    setQuoteAccordionExpanded(true)
    setLocationExpanded(false)
    setChatExpanded(true)
  }, [id])

  const load = useCallback(async () => {
    if (!id) {
      setBooking(null)
      setMyQuote(null)
      setLoading(false)
      return
    }
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

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )
  useEffect(() => {
    connectSocket()
    const unsubQuote = onQuoteEvents((data) => { if (data.bookingId === id) load() })
    const unsubMsg = onNewMessage((data) => { if (data.bookingId === id) load() })
    const unsubPaid = onBookingStatusChanged((data) => {
      if (data.bookingId === id) load()
    })
    return () => { unsubQuote(); unsubMsg(); unsubPaid() }
  }, [id, load])

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

  if (!id) {
    return (
      <View style={[styles.container, styles.missingIdWrap]}>
        <Text style={styles.missingIdText}>This booking could not be opened.</Text>
        <Button title="Go back" onPress={() => navigation.goBack()} />
      </View>
    )
  }

  if (loading || !booking) return <LoadingOverlay />

  const status = booking.status
  const canQuoteWhileRequested =
    status === 'REQUESTED' &&
    (!booking.mechanicId || booking.mechanicId === currentUserId)
  const messages = Array.isArray(booking.messages) ? booking.messages : []
  const chatReleased = booking.mechanicId && booking.status !== 'REQUESTED'
  const hasLocation =
    typeof (booking.locationLat ?? booking.location?.lat) === 'number' &&
    typeof (booking.locationLng ?? booking.location?.lng) === 'number'
  const photoUrls: string[] = Array.isArray(booking.photoUrls) ? booking.photoUrls : []

  const bookingStatusBadge = bookingStatusBadgeColors(status)
  const showPaidHero =
    Boolean(booking.paidAt) || status === 'PAID' || status === 'DELIVERED'
  const paidDisplayAmount =
    booking.paidAmount != null
      ? Number(booking.paidAmount)
      : booking.estimatedCost != null
        ? Number(booking.estimatedCost)
        : null
  const custPhone = customerPhone(booking.user)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <View style={styles.heroForest}>
            <BookingHeroDecor />
            <View style={styles.heroForestPad}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroVehicle}>
                    {booking.vehicle?.brand} {booking.vehicle?.model}
                  </Text>
                  <Text style={styles.heroFault}>{booking.fault?.name}</Text>
                  <View style={[styles.statusChip, { backgroundColor: bookingStatusBadge.bg }]}>
                    <Text style={[styles.statusChipText, { color: bookingStatusBadge.fg }]}>
                      {bookingStatusLabel(status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroRight}>
                  {showPaidHero && paidDisplayAmount != null ? (
                    <>
                      <Text style={styles.heroMoneyLabel}>TOTAL PAID</Text>
                      <Text style={styles.heroMoneyValue}>
                        ₦{paidDisplayAmount.toLocaleString()}
                      </Text>
                    </>
                  ) : booking.estimatedCost != null && !showPaidHero ? (
                    <>
                      <Text style={styles.heroMoneyLabel}>AGREED</Text>
                      <Text style={styles.heroMoneyValueMuted}>
                        ₦{Number(booking.estimatedCost).toLocaleString()}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>

              {booking.user ? (
                <View style={styles.mechRow}>
                  <View style={styles.mechAvatar}>
                    <Text style={styles.mechAvatarText}>{customerInitials(booking.user)}</Text>
                  </View>
                  <View style={styles.mechMeta}>
                    <Text style={styles.mechCompany} numberOfLines={1}>
                      {[booking.user?.firstName, booking.user?.lastName].filter(Boolean).join(' ') ||
                        'Customer'}
                    </Text>
                    <Text style={styles.mechSub} numberOfLines={2}>
                      Customer on this booking, coordinate timing and access here
                    </Text>
                  </View>
                  {custPhone ? (
                    <TouchableOpacity
                      style={styles.callPill}
                      onPress={() => Linking.openURL(`tel:${custPhone.replace(/\s/g, '')}`)}
                      accessibilityLabel="Call customer"
                    >
                      <Ionicons name="call" size={16} color={colors.primary[600]} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
          <BookingDetailProgressSteps status={status} role="mechanic" />
        </View>

        <BookingDetailAccordion
          title="Job & workshop actions"
          subtitle="Customer notes, agreed price, and buttons to move the job forward"
          icon="construct-outline"
          iconVariant="green"
          expanded={jobWorkExpanded}
          onToggle={() => setJobWorkExpanded((v) => !v)}
        >
          <Text style={styles.descriptionText}>
            {booking.description?.trim()
              ? booking.description
              : 'No written description. Use Ask a question (in Quotes) if you need more detail.'}
          </Text>
          <BookingPhotoGallery
            photoUrls={photoUrls}
            title="Issue photos from customer"
            subtitle="Use these photos to inspect the fault before you proceed"
            emptyHint="Customer did not attach photos for this request."
          />

          {status === 'REQUESTED' && booking.mechanicId === currentUserId ? (
            <Text style={styles.waitingHint}>
              This customer chose your garage. Send your quote in the section below; when they accept
              it, the job is confirmed and chat opens.
            </Text>
          ) : null}

          {status === 'ACCEPTED' ? (
            <Button
              title="Start work"
              onPress={() => updateStatus('IN_PROGRESS')}
              loading={updatingStatus}
              style={styles.actionBtn}
            />
          ) : null}
          {status === 'IN_PROGRESS' ? (
            <Button
              title="Mark as done"
              onPress={() => updateStatus('DONE')}
              loading={updatingStatus}
              style={styles.actionBtn}
            />
          ) : null}
          {(status === 'ACCEPTED' || status === 'IN_PROGRESS') && booking.estimatedCost == null ? (
            <View style={styles.costRow}>
              <Input
                placeholder="Cost estimate (₦)"
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                style={styles.costInput}
              />
              <Button title="Set cost" onPress={setCostSubmit} loading={updatingCost} />
            </View>
          ) : null}
          {booking.estimatedCost != null ? (
            <Text style={styles.cost}>Agreed estimate: ₦{Number(booking.estimatedCost).toLocaleString()}</Text>
          ) : null}
        </BookingDetailAccordion>

        {canQuoteWhileRequested ? (
          <BookingDetailAccordion
            title="Your quote & questions"
            subtitle="Price the job, add a short note, and ask the customer anything you need before they accept"
            icon="pricetags-outline"
            iconVariant="amber"
            expanded={quoteAccordionExpanded}
            onToggle={() => setQuoteAccordionExpanded((v) => !v)}
          >
            {myQuote ? (
              <View style={styles.quoteBlock}>
                <Text style={styles.quotePrice}>₦{Number(myQuote.proposedPrice).toLocaleString()}</Text>
                <Text style={styles.quoteStatus}>Status: {myQuote.status}</Text>
                {myQuote.status === 'PENDING' ? (
                  <>
                    <Input
                      label="Update price (₦)"
                      value={quotePrice}
                      onChangeText={setQuotePrice}
                      keyboardType="decimal-pad"
                    />
                    <Button title="Update quote" onPress={updateQuote} loading={updatingQuote} />
                  </>
                ) : null}
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
            <Text style={[styles.inlineSectionLabel, { marginTop: 18 }]}>Ask the customer</Text>
            <TextInput
              style={styles.clarificationInput}
              value={clarificationQuestion}
              onChangeText={setClarificationQuestion}
              placeholder="Ask for photos, symptoms, or access details…"
              placeholderTextColor={colors.neutral[400]}
              multiline
            />
            <Button
              title="Send question"
              onPress={askClarification}
              loading={submittingClarification}
              variant="outline"
              style={styles.formBtn}
            />
          </BookingDetailAccordion>
        ) : null}

        {hasLocation ? (
          <BookingDetailAccordion
            title="Job location"
            subtitle="Where the vehicle is. Open in Maps for directions"
            icon="location-outline"
            iconVariant="green"
            expanded={locationExpanded}
            onToggle={() => setLocationExpanded((v) => !v)}
          >
            <View style={styles.locationBlock}>
              <Text style={styles.locationAddress} numberOfLines={4}>
                {formatJobAddress(booking)}
              </Text>
              <TouchableOpacity style={styles.mapLink} onPress={openMap}>
                <Ionicons name="map" size={20} color={colors.primary[600]} />
                <Text style={styles.mapLinkText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          </BookingDetailAccordion>
        ) : null}

        <View style={styles.chatWrap}>
          <BookingDetailAccordion
            title="Messages"
            subtitle={
              chatReleased
                ? 'Customer chat: timing, parts, and on site updates'
                : 'Chat unlocks after the customer accepts your quote'
            }
            icon="chatbubbles-outline"
            iconVariant="blue"
            expanded={chatExpanded}
            onToggle={() => setChatExpanded((v) => !v)}
          >
            {chatReleased ? (
              <BookingChat
                bookingId={id}
                messages={messages}
                onMessagesChange={(next) => setBooking((b: any) => (b ? { ...b, messages: next } : b))}
              />
            ) : (
              <View style={styles.chatPlaceholder}>
                <Text style={styles.chatPlaceholderTitle}>Chat after quote is accepted</Text>
                <Text style={styles.chatPlaceholderText}>
                  Submit your price in Your quote & questions. Once the customer accepts, you can
                  message each other here.
                </Text>
              </View>
            )}
          </BookingDetailAccordion>
        </View>
      </ScrollView>
    </View>
  )
}

function customerInitials(u: any): string {
  const f = typeof u?.firstName === 'string' ? u.firstName.trim() : ''
  const l = typeof u?.lastName === 'string' ? u.lastName.trim() : ''
  const a = f[0] ?? ''
  const b = l[0] ?? ''
  const s = (a + b).toUpperCase()
  return s || '?'
}

function customerPhone(u: any): string | undefined {
  if (!u || typeof u !== 'object') return undefined
  const raw = u.phone ?? u.phoneNumber ?? u.mobile ?? u.contactPhone
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
}

function formatJobAddress(booking: any): string {
  if (booking.locationAddress && typeof booking.locationAddress === 'string') return booking.locationAddress
  const parts = [booking.locationStreet, booking.locationCity, booking.locationState].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return 'Job location'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand.page },
  missingIdWrap: { justifyContent: 'center', padding: 24 },
  missingIdText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  heroForest: {
    backgroundColor: colors.brand.forest,
    position: 'relative',
    overflow: 'hidden',
  },
  heroForestPad: { padding: 24, paddingBottom: 22 },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroRight: { alignItems: 'flex-end', maxWidth: '42%' },
  heroVehicle: {
    fontSize: 22,
    fontFamily: fonts.headingBold,
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroFault: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 8,
    lineHeight: 20,
  },
  heroMoneyLabel: {
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
  },
  heroMoneyValue: {
    fontSize: 20,
    fontFamily: fonts.headingBold,
    color: colors.primary[300],
    marginTop: 4,
  },
  heroMoneyValueMuted: {
    fontSize: 17,
    fontFamily: fonts.headingBold,
    color: 'rgba(74, 222, 128, 0.95)',
    marginTop: 4,
  },
  mechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    gap: 12,
  },
  mechAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechAvatarText: { fontSize: 16, fontFamily: fonts.headingBold, color: '#fff' },
  mechMeta: { flex: 1, minWidth: 0 },
  mechCompany: { fontSize: 15, fontFamily: fonts.semiBold, color: '#fff' },
  mechSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    lineHeight: 15,
  },
  callPill: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  statusChipText: { fontSize: 13, fontFamily: fonts.semiBold },
  inlineSectionLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.neutral[600],
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  descriptionText: { fontSize: 15, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 22 },
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
  waitingHint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 12,
  },
  costRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 16 },
  costInput: { flex: 1, marginBottom: 0 },
  cost: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 12 },
  locationBlock: { marginTop: 4 },
  locationAddress: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mapLinkText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.primary[600] },
  chatWrap: { marginTop: 8 },
  chatPlaceholder: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  chatPlaceholderTitle: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
    color: colors.text,
    marginBottom: 8,
  },
  chatPlaceholderText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 21,
  },
})
