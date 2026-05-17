import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import {
  bookingsAPI,
  ratingsAPI,
  walletAPI,
  getApiErrorMessage,
  configAPI,
  usersAPI,
} from '../../services/api'
import { connectSocket, onQuoteEvents, onNewMessage, onBookingStatusChanged } from '../../services/socket'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { bookingStatusBadgeColors, bookingStatusLabel } from '../../utils/bookingStatusBadge'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { BookingChat } from '../../components/BookingChat'
import { PaystackCheckoutModal } from '../../components/PaystackCheckoutModal'
import { BookingDetailAccordion } from '../../components/bookingDetail/BookingDetailAccordion'
import { BookingDetailProgressSteps } from '../../components/bookingDetail/BookingDetailProgressSteps'
import { BookingHeroDecor } from '../../components/bookingDetail/BookingHeroDecor'
import { BookingPhotoGallery } from '../../components/bookingDetail/BookingPhotoGallery'

const PAYMENT_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'DONE']
const MAX_BOOKING_PHOTOS = 3
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const REPORT_REASONS = [
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'SAFETY', label: 'Safety concern' },
  { value: 'SPAM', label: 'Spam or misleading' },
  { value: 'OTHER', label: 'Other' },
] as const

export function BookingDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const id =
    route?.params != null && route.params.id != null && route.params.id !== ''
      ? String(route.params.id)
      : ''
  const insets = useSafeAreaInsets()
  const pendingPaystackRef = useRef<string | null>(null)
  const verifyingPaystackRef = useRef(false)
  const [booking, setBooking] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [ratingSkipped, setRatingSkipped] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null)
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [markingDirect, setMarkingDirect] = useState(false)
  const [answeringClarificationId, setAnsweringClarificationId] = useState<string | null>(null)
  const [clarificationAnswer, setClarificationAnswer] = useState('')
  const [publicFlags, setPublicFlags] = useState<Record<string, boolean | number | string> | null>(
    null
  )
  const [photoUploading, setPhotoUploading] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [blockSubmitting, setBlockSubmitting] = useState(false)
  const [paystackCheckoutUrl, setPaystackCheckoutUrl] = useState<string | null>(null)
  const [paystackCheckoutRef, setPaystackCheckoutRef] = useState<string | null>(null)

  const [jobDetailsExpanded, setJobDetailsExpanded] = useState(true)
  const [quotesExpanded, setQuotesExpanded] = useState(true)
  const [qaExpanded, setQaExpanded] = useState(true)
  const [locationExpanded, setLocationExpanded] = useState(false)
  const [safetyExpanded, setSafetyExpanded] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(true)

  useEffect(() => {
    setRatingSkipped(false)
    setJobDetailsExpanded(true)
    setQuotesExpanded(true)
    setQaExpanded(true)
    setLocationExpanded(false)
    setSafetyExpanded(false)
    setChatExpanded(true)
  }, [id])

  useEffect(() => {
    configAPI
      .getPublic()
      .then((r) => {
        const d = r.data as Record<string, unknown> & {
          flags?: Record<string, boolean | number | string>
        }
        setPublicFlags(d?.flags ?? (d as Record<string, boolean | number | string>))
      })
      .catch(() => setPublicFlags({}))
  }, [])

  const load = useCallback(async () => {
    if (!id) {
      setBooking(null)
      setQuotes([])
      setLoading(false)
      return
    }
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

  useEffect(() => {
    connectSocket()
    const unsubQuote = onQuoteEvents((data) => {
      if (data.bookingId === id) load()
    })
    const unsubMsg = onNewMessage((data) => {
      if (data.bookingId === id) load()
    })
    const unsubPaid = onBookingStatusChanged((data) => {
      if (data.bookingId === id) load()
    })
    return () => {
      unsubQuote()
      unsubMsg()
      unsubPaid()
    }
  }, [id, load])

  const tryVerifyPaystack = useCallback(async () => {
    const ref = pendingPaystackRef.current
    if (!ref || verifyingPaystackRef.current) return
    verifyingPaystackRef.current = true
    try {
      const r = await walletAPI.verifyPayment(ref)
      if (r.data?.success) {
        pendingPaystackRef.current = null
        setPaystackCheckoutUrl(null)
        setPaystackCheckoutRef(null)
        await load()
        Alert.alert('Payment successful', 'Your booking is marked as paid.')
      }
    } catch {
      // Still pending, cancelled, or network error; keep pending ref for retry on next focus
    } finally {
      verifyingPaystackRef.current = false
    }
  }, [load])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void tryVerifyPaystack()
    })
    return () => sub.remove()
  }, [tryVerifyPaystack])

  useFocusEffect(
    useCallback(() => {
      load()
      void tryVerifyPaystack()
    }, [load, tryVerifyPaystack])
  )

  useEffect(() => {
    if (booking) setDescriptionDraft(booking.description ?? '')
  }, [booking?.description])

  useEffect(() => {
    if (!id || !booking?.mechanicId || booking.status === 'REQUESTED') return
    bookingsAPI.markMessagesRead(id).catch(() => {})
  }, [id, booking?.mechanicId, booking?.status])

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
      const ref = res.data?.reference
      if (url && ref) {
        pendingPaystackRef.current = ref
        setPaystackCheckoutUrl(url)
        setPaystackCheckoutRef(ref)
      }
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

  const pickAndUploadPhotos = async () => {
    const b = booking
    if (!b) return
    const photoUrls: string[] = Array.isArray(b.photoUrls) ? b.photoUrls : []
    const room = MAX_BOOKING_PHOTOS - photoUrls.length
    if (room <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_BOOKING_PHOTOS} photos`)
      return
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add images.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.85,
    })
    if (result.canceled) return
    const assets = result.assets || []
    for (const a of assets) {
      if (a.fileSize != null && a.fileSize > MAX_PHOTO_BYTES) {
        Alert.alert('File too large', 'Each photo must be under 5MB')
        return
      }
    }
    const files = assets.slice(0, room).map((a) => ({
      uri: a.uri,
      name: a.fileName || 'photo.jpg',
      type: a.mimeType || 'image/jpeg',
    }))
    setPhotoUploading(true)
    try {
      await bookingsAPI.uploadBookingPhotos(id, files)
      load()
    } catch (e: any) {
      Alert.alert('Upload failed', getApiErrorMessage(e, 'Check your connection and try again'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Reason required', 'Please choose a reason for the report.')
      return
    }
    setReportSubmitting(true)
    try {
      await bookingsAPI.reportBooking(id, reportReason.trim(), reportDetails.trim() || undefined)
      setReportOpen(false)
      setReportReason('')
      setReportDetails('')
      Alert.alert('Thank you', 'Your report has been submitted.')
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not submit report'))
    } finally {
      setReportSubmitting(false)
    }
  }

  const submitDispute = async () => {
    if (!disputeReason.trim()) {
      Alert.alert('Details needed', 'Please describe what went wrong.')
      return
    }
    setDisputeSubmitting(true)
    try {
      await bookingsAPI.disputeBooking(id, disputeReason.trim())
      setDisputeOpen(false)
      setDisputeReason('')
      load()
      Alert.alert('Recorded', 'We have logged your dispute.')
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not submit dispute'))
    } finally {
      setDisputeSubmitting(false)
    }
  }

  const blockMechanic = () => {
    const mechId = booking?.mechanic?.id
    if (!mechId) return
    Alert.alert(
      'Block this mechanic?',
      'They will not appear in your searches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBlockSubmitting(true)
            try {
              await usersAPI.blockMechanic(mechId)
              Alert.alert('Done', 'Mechanic blocked.')
            } catch (e: any) {
              Alert.alert('Error', getApiErrorMessage(e, 'Could not block'))
            } finally {
              setBlockSubmitting(false)
            }
          },
        },
      ]
    )
  }

  const primaryBar = useMemo(() => {
    if (!booking) return { kind: 'none' as const }
    const pending = quotes.filter((q: any) => q.status === 'PENDING')
    const payOk = publicFlags?.paymentsEnabled !== false
    const canPayNow =
      PAYMENT_STATUSES.includes(booking.status) &&
      !booking.paidAt &&
      (booking.estimatedCost ?? 0) > 0
    if (canPayNow && payOk) return { kind: 'pay' as const }
    const alreadyRated = Array.isArray(booking.ratings) && booking.ratings.length > 0
    const canRate =
      Boolean(booking.mechanicId) &&
      !alreadyRated &&
      ['DONE', 'PAID', 'DELIVERED'].includes(booking.status)
    if (canRate && !showRating && !ratingSkipped) return { kind: 'rate' as const }
    if (booking.status === 'REQUESTED' && pending.length === 1) {
      const q = pending[0]
      return {
        kind: 'quote' as const,
        quoteId: q.id,
        price: Number(q.proposedPrice),
      }
    }
    return { kind: 'none' as const }
  }, [booking, quotes, showRating, ratingSkipped, publicFlags])

  if (!id) {
    return (
      <View style={[styles.container, styles.missingIdWrap]}>
        <Text style={styles.missingIdText}>This booking could not be opened.</Text>
        <Button title="Go back" onPress={() => navigation.goBack()} />
      </View>
    )
  }

  if (loading || !booking) return <LoadingOverlay />

  const messages = Array.isArray(booking.messages) ? booking.messages : []
  const clarifications = Array.isArray(booking.clarifications) ? booking.clarifications : []
  const pendingQuotes = quotes.filter((q: any) => q.status === 'PENDING')
  const chatReleased = booking.mechanicId && booking.status !== 'REQUESTED'
  const canPay =
    PAYMENT_STATUSES.includes(booking.status) &&
    !booking.paidAt &&
    (booking.estimatedCost ?? 0) > 0
  const hasLocation =
    typeof (booking.locationLat ?? booking.location?.lat) === 'number' &&
    typeof (booking.locationLng ?? booking.location?.lng) === 'number'
  const paymentsEnabled = publicFlags?.paymentsEnabled !== false
  const photoUrls: string[] = Array.isArray(booking.photoUrls) ? booking.photoUrls : []
  const showDisputeBtn = ['ACCEPTED', 'IN_PROGRESS', 'DONE', 'PAID', 'DELIVERED'].includes(
    booking.status
  )
  const showReceipt =
    Boolean(booking.paidAt) ||
    booking.status === 'PAID' ||
    booking.status === 'DELIVERED'
  const paidDisplayAmount =
    booking.paidAmount != null
      ? Number(booking.paidAmount)
      : booking.estimatedCost != null
        ? Number(booking.estimatedCost)
        : null

  const bookingStatusBadge = bookingStatusBadgeColors(booking.status)
  const mechPhone = mechanicPhone(booking.mechanic)

  const stickyPad =
    primaryBar.kind === 'none'
      ? 24
      : primaryBar.kind === 'pay'
        ? 24 + insets.bottom + 148
        : 24 + insets.bottom + 84

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: stickyPad }]}>
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
                      {bookingStatusLabel(booking.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroRight}>
                  {showReceipt && paidDisplayAmount != null ? (
                    <>
                      <Text style={styles.heroMoneyLabel}>TOTAL PAID</Text>
                      <Text style={styles.heroMoneyValue}>
                        ₦{paidDisplayAmount.toLocaleString()}
                      </Text>
                    </>
                  ) : (booking.pricingSummary?.customerTotalNaira ?? booking.estimatedCost) != null &&
                    !showReceipt ? (
                    <>
                      <Text style={styles.heroMoneyLabel}>TOTAL</Text>
                      <Text style={styles.heroMoneyValueMuted}>
                        ₦{Number(
                          booking.pricingSummary?.customerTotalNaira ?? booking.estimatedCost
                        ).toLocaleString()}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>

              {booking.mechanic ? (
                <View style={styles.mechRow}>
                  <View style={styles.mechAvatar}>
                    <Text style={styles.mechAvatarText}>{mechanicInitials(booking.mechanic)}</Text>
                  </View>
                  <View style={styles.mechMeta}>
                    <Text style={styles.mechCompany} numberOfLines={1}>
                      {booking.mechanic.companyName}
                    </Text>
                    <Text style={styles.mechSub} numberOfLines={2}>
                      {booking.mechanic.ownerFullName}, your assigned mechanic
                    </Text>
                  </View>
                  {mechPhone ? (
                    <TouchableOpacity
                      style={styles.callPill}
                      onPress={() => Linking.openURL(`tel:${mechPhone.replace(/\s/g, '')}`)}
                      accessibilityLabel="Call mechanic"
                    >
                      <Ionicons name="call" size={16} color={colors.primary[600]} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.heroNoMech}>
                  When a mechanic sends a quote and you accept it, their details will show here.
                </Text>
              )}
            </View>
          </View>
          <BookingDetailProgressSteps status={booking.status} role="user" />
          {showReceipt ? (
            <TouchableOpacity
              style={styles.receiptRow}
              onPress={() => navigation.navigate('BookingReceipt', { id: booking.id })}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.primary[600]} />
              <Text style={styles.receiptRowText}>View payment summary and receipt</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        <>
          <BookingDetailAccordion
            title="Job details"
            subtitle="What you told mechanics: description and photos"
            icon="document-text-outline"
            iconVariant="green"
            expanded={jobDetailsExpanded}
            onToggle={() => setJobDetailsExpanded((v) => !v)}
          >
            {booking.status === 'REQUESTED' && editingDescription ? (
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
                {booking.status === 'REQUESTED' ? (
                  <TouchableOpacity onPress={() => setEditingDescription(true)}>
                    <Text style={styles.editLink}>Edit description</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            <BookingPhotoGallery
              photoUrls={photoUrls}
              title="Issue photos"
              subtitle="Share clear photos so mechanics can diagnose faster"
              emptyHint="No photos added yet."
            />

            {booking.status === 'REQUESTED' && (
              <>
                <Text style={[styles.sectionLabel, styles.sectionLabelInCollapse]}>
                  Add photos (optional, up to {MAX_BOOKING_PHOTOS})
                </Text>
                <TouchableOpacity
                  style={[styles.addPhotoBtn, photoUrls.length >= MAX_BOOKING_PHOTOS && styles.addPhotoBtnDisabled]}
                  onPress={pickAndUploadPhotos}
                  disabled={photoUploading || photoUrls.length >= MAX_BOOKING_PHOTOS}
                >
                  <Ionicons name="images-outline" size={20} color={colors.primary[600]} />
                  <Text style={styles.addPhotoBtnText}>
                    {photoUploading ? 'Uploading…' : 'Add photos'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </BookingDetailAccordion>

          {booking.status === 'REQUESTED' && (
            <BookingDetailAccordion
              title="Quotes & pricing"
              subtitle="Review prices and messages, then accept the quote you prefer"
              icon="pricetags-outline"
              iconVariant="amber"
              expanded={quotesExpanded}
              onToggle={() => setQuotesExpanded((v) => !v)}
              badge={pendingQuotes.length > 0 ? String(pendingQuotes.length) : undefined}
            >
              {!booking.mechanicId && pendingQuotes.length === 0 && (
                <Text style={styles.quotesHint}>
                  Quotes from interested mechanics will appear here.
                </Text>
              )}
              {booking.mechanicId && pendingQuotes.length === 0 && (
                <Card style={styles.waitingCard}>
                  <Text style={styles.waitingTitle}>
                    Waiting for {booking.mechanic?.companyName ?? 'the mechanic'} to send a quote
                  </Text>
                  <Text style={styles.waitingText}>
                    You can chat once you accept their price.
                  </Text>
                </Card>
              )}
              {pendingQuotes.length > 0 && (
                <>
                  <Text style={styles.quotesHint}>Tap Accept on the quote you want.</Text>
                  {pendingQuotes.map((q: any) => (
                    <View key={q.id} style={styles.quoteCard}>
                      <Text style={styles.quoteMech}>{q.mechanic?.companyName ?? 'Mechanic'}</Text>
                      <Text style={styles.quotePrice}>
                        ₦{Number(q.customerTotalNaira ?? q.proposedPrice).toLocaleString()}
                      </Text>
                      {(q.partsNaira > 0 || q.labourNaira > 0) && (
                        <Text style={styles.quoteBreakdown}>
                          {q.partsNaira > 0 ? `Parts ₦${Number(q.partsNaira).toLocaleString()}` : ''}
                          {q.partsNaira > 0 && q.labourNaira > 0 ? ' · ' : ''}
                          {q.labourNaira > 0 ? `Labour ₦${Number(q.labourNaira).toLocaleString()}` : ''}
                        </Text>
                      )}
                      {q.message ? (
                        <Text style={styles.quoteMessage}>{q.message}</Text>
                      ) : null}
                      {primaryBar.kind === 'quote' && primaryBar.quoteId === q.id ? (
                        <Text style={styles.stickyHint}>You can also use the bar below.</Text>
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
            </BookingDetailAccordion>
          )}

          {clarifications.length > 0 && (
            <BookingDetailAccordion
              title="Questions & answers"
              subtitle="Mechanic questions about the job. Reply so they can quote accurately"
              icon="help-circle-outline"
              iconVariant="blue"
              expanded={qaExpanded}
              onToggle={() => setQaExpanded((v) => !v)}
              badge={
                clarifications.filter((c: any) => !c.answer).length > 0 ? '!' : undefined
              }
            >
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
            </BookingDetailAccordion>
          )}

          {canPay && !paymentsEnabled && (
            <Text style={styles.paymentsDisabledNote}>
              Online payments are not available in your region yet.
            </Text>
          )}

          {booking.status !== 'EXPIRED' && (
            <BookingDetailAccordion
              title="Safety & support"
              subtitle="Protection, payments, and how to get help with this job"
              icon="shield-checkmark-outline"
              iconVariant="blue"
              expanded={safetyExpanded}
              onToggle={() => setSafetyExpanded((v) => !v)}
            >
              <Text style={styles.safetyHint}>
                Use report for behaviour or safety concerns. Use dispute for payment or work quality
                issues. You can block a mechanic if you no longer want them to contact you.
              </Text>
              <View style={styles.safetyActions}>
                <Button title="Report" variant="outline" onPress={() => setReportOpen(true)} />
                {showDisputeBtn ? (
                  <Button title="Dispute" variant="outline" onPress={() => setDisputeOpen(true)} />
                ) : null}
                {booking.mechanic?.id ? (
                  <Button
                    title={blockSubmitting ? 'Blocking…' : 'Block mechanic'}
                    variant="outline"
                    onPress={blockMechanic}
                    disabled={blockSubmitting}
                  />
                ) : null}
              </View>
              {booking.disputeReason ? (
                <Text style={styles.disputeNote}>Dispute recorded: {booking.disputeReason}</Text>
              ) : null}
            </BookingDetailAccordion>
          )}

          {hasLocation && (
            <BookingDetailAccordion
              title="Job location"
              subtitle="Where the work happens. Open in Maps when you are ready to go"
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
          )}
        </>

        <View style={styles.chatSectionWrap}>
        <BookingDetailAccordion
          title="Messages"
          subtitle={
            chatReleased
              ? 'Chat with your mechanic: updates, photos, and quick questions'
              : 'Messaging unlocks after you accept a quote for this booking'
          }
          icon="chatbubbles-outline"
          iconVariant="green"
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
              <Text style={styles.chatPlaceholderTitle}>Chat after you accept a quote</Text>
              <Text style={styles.chatPlaceholderText}>
                {booking.mechanicId
                  ? 'Accept this mechanic’s quote under Quotes & pricing to confirm the job and open chat.'
                  : 'Accept one of the quotes above to confirm the job and message your mechanic.'}
              </Text>
            </View>
          )}
        </BookingDetailAccordion>
        </View>
      </ScrollView>

      {primaryBar.kind !== 'none' && (
        <View style={[styles.stickyActionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {primaryBar.kind === 'pay' && paymentsEnabled && (
            <View style={styles.stickyInner}>
              <Button
                title={paying ? 'Starting…' : 'Pay in app'}
                onPress={payWithPaystack}
                loading={paying}
                style={styles.stickyPrimaryBtn}
              />
              <Button
                title="I paid the mechanic directly"
                variant="outline"
                onPress={markDirectPaid}
                loading={markingDirect}
                style={styles.stickySecondaryBtn}
              />
            </View>
          )}
          {primaryBar.kind === 'rate' && (
            <View style={styles.stickyInner}>
              <Button
                title="Rate mechanic"
                onPress={() => setShowRating(true)}
                variant="secondary"
                style={styles.stickyPrimaryBtn}
              />
              <Button
                title="Skip for now"
                variant="outline"
                onPress={() => setRatingSkipped(true)}
                style={styles.stickySecondaryBtn}
              />
            </View>
          )}
          {primaryBar.kind === 'quote' && (
            <Button
              title={`Accept quote: ₦${primaryBar.price.toLocaleString()}`}
              onPress={() => acceptQuote(primaryBar.quoteId)}
              loading={acceptingQuoteId === primaryBar.quoteId}
              style={styles.stickyPrimaryBtn}
            />
          )}
        </View>
      )}

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.ratingModal}>
          <Card style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Report this job</Text>
            <Text style={styles.modalLabel}>Reason</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.reasonChip, reportReason === r.value && styles.reasonChipActive]}
                onPress={() => setReportReason(r.value)}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    reportReason === r.value && styles.reasonChipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.modalLabel}>Details (optional)</Text>
            <TextInput
              style={styles.commentInput}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Anything else we should know?"
              placeholderTextColor={colors.neutral[400]}
              multiline
            />
            <Button title="Submit report" onPress={submitReport} loading={reportSubmitting} />
            <Button title="Cancel" variant="outline" style={styles.cancelBtn} onPress={() => setReportOpen(false)} />
          </Card>
        </View>
      </Modal>

      <Modal visible={disputeOpen} transparent animationType="fade" onRequestClose={() => setDisputeOpen(false)}>
        <View style={styles.ratingModal}>
          <Card style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Something wrong with this job?</Text>
            <Text style={styles.modalLabel}>Describe the issue</Text>
            <TextInput
              style={styles.commentInput}
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="What went wrong?"
              placeholderTextColor={colors.neutral[400]}
              multiline
            />
            <Button title="Submit dispute" onPress={submitDispute} loading={disputeSubmitting} />
            <Button title="Cancel" variant="outline" style={styles.cancelBtn} onPress={() => setDisputeOpen(false)} />
          </Card>
        </View>
      </Modal>

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
              title="Skip for now"
              onPress={() => {
                setShowRating(false)
                setRatingSkipped(true)
              }}
              variant="outline"
              style={styles.cancelBtn}
            />
          </Card>
        </View>
      )}

      <PaystackCheckoutModal
        visible={Boolean(paystackCheckoutUrl && paystackCheckoutRef)}
        authorizationUrl={paystackCheckoutUrl}
        expectedReference={paystackCheckoutRef}
        title="Pay for booking"
        onRequestClose={() => {
          setPaystackCheckoutUrl(null)
          setPaystackCheckoutRef(null)
        }}
        verifyPayment={(reference) => walletAPI.verifyPayment(reference)}
        onVerified={async () => {
          pendingPaystackRef.current = null
          await load()
          Alert.alert('Payment successful', 'Your booking is marked as paid.')
        }}
      />
    </View>
  )
}

function mechanicInitials(m: any): string {
  const owner = typeof m?.ownerFullName === 'string' ? m.ownerFullName.trim() : ''
  if (owner) {
    const parts = owner.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? ''
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
    const s = (a + b).toUpperCase()
    if (s) return s
  }
  const co = typeof m?.companyName === 'string' ? m.companyName.trim().slice(0, 2) : ''
  return co.toUpperCase() || '?'
}

function mechanicPhone(m: any): string | undefined {
  if (!m || typeof m !== 'object') return undefined
  const p = m.profile && typeof m.profile === 'object' ? m.profile : null
  const raw =
    m.phone ??
    m.phoneNumber ??
    m.mobile ??
    m.contactPhone ??
    m.workshopPhone ??
    m.ownerPhone ??
    p?.phone ??
    p?.phoneNumber ??
    p?.mobile
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
  heroNoMech: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 14,
    lineHeight: 19,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  receiptRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary[700],
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  statusChipText: { fontSize: 13, fontFamily: fonts.semiBold },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
    letterSpacing: 0.4,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLabelInCollapse: {
    marginTop: 16,
    marginBottom: 8,
  },
  quotesHint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  stickyHint: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 8,
    fontStyle: 'italic',
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
  quoteBreakdown: { fontSize: 12, color: colors.neutral[500], marginTop: 4 },
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
  locationBlock: { marginTop: 4 },
  locationAddress: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mapLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  stickyActionBar: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  stickyInner: { gap: 10 },
  stickyPrimaryBtn: { width: '100%' as const },
  stickySecondaryBtn: { width: '100%' as const },
  waitingCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.accent.amber + '18',
    borderWidth: 1,
    borderColor: colors.accent.amber + '44',
  },
  waitingTitle: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 22 },
  waitingText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
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
  photoRow: { marginBottom: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: colors.neutral[100],
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  addPhotoBtnDisabled: { opacity: 0.5 },
  addPhotoBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  chatSectionWrap: { marginTop: 8 },
  paymentsDisabledNote: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 20,
  },
  safetyHint: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  safetyActions: { gap: 10, flexDirection: 'column' },
  disputeNote: {
    marginTop: 12,
    fontSize: 13,
    color: colors.accent.amber,
    backgroundColor: colors.accent.amber + '18',
    padding: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
    marginBottom: 8,
    marginTop: 8,
  },
  reasonChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: 8,
    backgroundColor: colors.neutral[50],
  },
  reasonChipActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  reasonChipText: { fontSize: 14, color: colors.text },
  reasonChipTextActive: { fontWeight: '600', color: colors.primary[700] },
})
