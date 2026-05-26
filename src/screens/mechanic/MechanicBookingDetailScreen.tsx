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
import { canShowBookingContactPhone, customerPhone } from '../../utils/bookingContact'
import { quoteStatusLabel } from '../../utils/quoteStatusLabel'
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
  const [partsCost, setPartsCost] = useState('')
  const [labourCost, setLabourCost] = useState('')
  const [otherFees, setOtherFees] = useState('')
  const [updatingCost, setUpdatingCost] = useState(false)
  const [submittingInvoice, setSubmittingInvoice] = useState(false)
  const [quoteType, setQuoteType] = useState<'STANDARD' | 'INSPECTION'>('STANDARD')
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
      if (mine) {
        setQuoteType(mine.quoteType === 'INSPECTION' ? 'INSPECTION' : 'STANDARD')
        setPartsCost(String(mine.partsNaira ?? 0))
        setLabourCost(String(mine.labourNaira ?? mine.proposedPrice ?? ''))
        setOtherFees(String(mine.otherFeesNaira ?? 0))
        setQuoteMessage(mine.message ?? '')
      }
      const inv = b.activeInvoice
      if (inv) {
        setPartsCost(String(inv.partsNaira ?? 0))
        setLabourCost(String(inv.labourNaira ?? 0))
        setOtherFees(String(inv.otherFeesNaira ?? 0))
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

  const quoteTotal = () => {
    const p = parseFloat(partsCost) || 0
    const l = parseFloat(labourCost) || 0
    const o = parseFloat(otherFees) || 0
    return p + l + o
  }

  const saveCosting = async () => {
    const total = quoteTotal()
    if (total <= 0) {
      Alert.alert('Required', 'Enter parts, labour, or other fees')
      return
    }
    setUpdatingCost(true)
    try {
      await bookingsAPI.upsertInvoice(id, {
        partsCost: parseFloat(partsCost) || 0,
        labourCost: parseFloat(labourCost) || 0,
        otherFees: parseFloat(otherFees) || 0,
      })
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setUpdatingCost(false)
    }
  }

  const submitRepairInvoice = async () => {
    setSubmittingInvoice(true)
    try {
      await bookingsAPI.submitInvoice(id)
      load()
      Alert.alert('Sent', 'Repair quote sent to the customer for approval.')
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSubmittingInvoice(false)
    }
  }

  const submitQuote = async () => {
    const isInspection = quoteType === 'INSPECTION'
    const total = isInspection ? parseFloat(labourCost) || 0 : quoteTotal()
    if (total <= 0) {
      Alert.alert('Required', isInspection ? 'Enter an inspection / diagnosis fee' : 'Enter a valid cost breakdown')
      return
    }
    setSubmittingQuote(true)
    try {
      await bookingsAPI.createQuote(id, {
        quoteType,
        partsCost: isInspection ? 0 : parseFloat(partsCost) || 0,
        labourCost: isInspection ? total : parseFloat(labourCost) || 0,
        otherFees: isInspection ? 0 : parseFloat(otherFees) || 0,
        message: quoteMessage.trim() || undefined,
      })
      load()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    } finally {
      setSubmittingQuote(false)
    }
  }

  const updateQuote = async () => {
    const total = quoteTotal()
    if (total <= 0 || !myQuote) return
    setUpdatingQuote(true)
    try {
      await bookingsAPI.updateQuote(id, myQuote.id, {
        partsCost: parseFloat(partsCost) || 0,
        labourCost: parseFloat(labourCost) || 0,
        otherFees: parseFloat(otherFees) || 0,
      })
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
  const isInspectionJob = booking?.acceptedQuote?.quoteType === 'INSPECTION'
  const isOwnActiveJob =
    Boolean(
      (status === 'ACCEPTED' || status === 'IN_PROGRESS') &&
        !booking?.paidAt &&
        booking?.mechanicId === currentUserId,
    )
  const inspectionPaymentPending =
    Boolean(isInspectionJob && isOwnActiveJob && !booking?.inspectionPaidAt)
  const canEditRepairCosting =
    isOwnActiveJob && (!isInspectionJob || Boolean(booking?.inspectionPaidAt))
  const repairInvoiceStatus = booking?.activeInvoice?.status
  const repairInvoiceLocked =
    repairInvoiceStatus === 'SUBMITTED' || repairInvoiceStatus === 'ACCEPTED'
  const canStartWork = status === 'ACCEPTED' && (!isInspectionJob || Boolean(booking?.inspectionPaidAt))
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
  const custPhone = canShowBookingContactPhone(booking) ? customerPhone(booking.user) : undefined

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

          {isInspectionJob && (status === 'ACCEPTED' || status === 'IN_PROGRESS') && isOwnActiveJob ? (
            <View style={styles.inspectionPaymentStatus}>
              <Text style={styles.inspectionPaymentStatusTitle}>Inspection payment</Text>
              {booking.inspectionPaidAt ? (
                <Text style={styles.inspectionPaymentStatusPaid}>
                  Paid: ₦{Number(booking.inspectionPaidAmount ?? booking.estimatedCost ?? 0).toLocaleString()} — you
                  can start work and submit the full repair quote.
                </Text>
              ) : (
                <Text style={styles.inspectionPaymentStatusPending}>
                  Waiting for the customer to pay the inspection fee. Start work and the repair quote form unlock after
                  payment.
                </Text>
              )}
            </View>
          ) : null}

          {status === 'ACCEPTED' ? (
            <>
              <Button
                title="Start work"
                onPress={() => updateStatus('IN_PROGRESS')}
                loading={updatingStatus}
                disabled={!canStartWork}
                style={styles.actionBtn}
              />
              {!canStartWork && isInspectionJob ? (
                <Text style={styles.inspectionHint}>
                  Available after the customer pays the inspection fee.
                </Text>
              ) : null}
            </>
          ) : null}
          {status === 'IN_PROGRESS' ? (
            <Button
              title="Mark as done"
              onPress={() => updateStatus('DONE')}
              loading={updatingStatus}
              style={styles.actionBtn}
            />
          ) : null}
          {inspectionPaymentPending ? (
            <View style={styles.costBreakdownBlock}>
              <Text style={styles.costBreakdownTitle}>Full repair quote</Text>
              <Text style={styles.inspectionHint}>
                The customer pays the inspection fee before you can submit the full repair quote.
              </Text>
              <Input label="Parts / materials (₦)" value="" editable={false} />
              <Input label="Labour / service (₦)" value="" editable={false} />
              <Input label="Other fees (₦)" value="" editable={false} />
              <Button title="Save draft" onPress={() => {}} disabled style={styles.actionBtn} />
              <Button
                title="Send to customer for approval"
                onPress={() => {}}
                disabled
                variant="outline"
                style={styles.actionBtn}
              />
            </View>
          ) : null}
          {canEditRepairCosting ? (
            <View style={styles.costBreakdownBlock}>
              <Text style={styles.costBreakdownTitle}>
                {isInspectionJob ? 'Full repair quote' : 'Job costing'}
              </Text>
              {repairInvoiceLocked ? (
                <Text style={styles.inspectionHint}>
                  {repairInvoiceStatus === 'SUBMITTED'
                    ? 'Waiting for the customer to accept this repair quote. You cannot edit it until they respond.'
                    : 'Repair quote accepted — the customer can pay the balance.'}
                </Text>
              ) : null}
              <Input
                label="Parts / materials (₦)"
                value={partsCost}
                onChangeText={setPartsCost}
                keyboardType="decimal-pad"
                editable={!repairInvoiceLocked}
              />
              <Input
                label="Labour / service (₦)"
                value={labourCost}
                onChangeText={setLabourCost}
                keyboardType="decimal-pad"
                editable={!repairInvoiceLocked}
              />
              <Input
                label="Other fees (₦)"
                value={otherFees}
                onChangeText={setOtherFees}
                keyboardType="decimal-pad"
                editable={!repairInvoiceLocked}
              />
              <Text style={styles.costTotal}>Total: ₦{quoteTotal().toLocaleString()}</Text>
              {isInspectionJob && booking.inspectionPaidAmount ? (
                <Text style={styles.costTotal}>
                  Customer balance after inspection credit: ₦
                  {Math.max(0, quoteTotal() - Number(booking.inspectionPaidAmount)).toLocaleString()}
                </Text>
              ) : null}
              <Button
                title="Save draft"
                onPress={saveCosting}
                loading={updatingCost}
                disabled={repairInvoiceLocked}
              />
              {repairInvoiceStatus === 'DRAFT' || !repairInvoiceStatus ? (
                <Button
                  title={submittingInvoice ? 'Sending…' : 'Send to customer for approval'}
                  onPress={submitRepairInvoice}
                  loading={submittingInvoice}
                  disabled={repairInvoiceLocked}
                  variant="outline"
                  style={styles.actionBtn}
                />
              ) : null}
              {repairInvoiceStatus === 'SUBMITTED' ? (
                <Text style={styles.inspectionHint}>Waiting for customer to accept this repair quote.</Text>
              ) : null}
              {repairInvoiceStatus === 'ACCEPTED' ? (
                <Text style={styles.inspectionHint}>Repair quote accepted — customer can pay the balance.</Text>
              ) : null}
            </View>
          ) : null}
          {booking.pricingSummary?.customerTotalNaira != null ? (
            <Text style={styles.cost}>
              Total payable: ₦{Number(booking.pricingSummary.customerTotalNaira).toLocaleString()}
            </Text>
          ) : booking.estimatedCost != null ? (
            <Text style={styles.cost}>Agreed estimate: ₦{Number(booking.estimatedCost).toLocaleString()}</Text>
          ) : null}
        </BookingDetailAccordion>

        {canQuoteWhileRequested ? (
          <BookingDetailAccordion
            title="Your quote & questions"
            subtitle="Price the job, ask questions, or offer an inspection visit before they accept"
            icon="pricetags-outline"
            iconVariant="amber"
            expanded={quoteAccordionExpanded}
            onToggle={() => setQuoteAccordionExpanded((v) => !v)}
          >
            <View style={styles.quoteTypeRow}>
              <TouchableOpacity
                style={[styles.quoteTypePill, quoteType === 'STANDARD' && styles.quoteTypePillActive]}
                onPress={() => setQuoteType('STANDARD')}
              >
                <Text style={[styles.quoteTypeText, quoteType === 'STANDARD' && styles.quoteTypeTextActive]}>
                  Full repair quote
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quoteTypePill, quoteType === 'INSPECTION' && styles.quoteTypePillActive]}
                onPress={() => setQuoteType('INSPECTION')}
              >
                <Text style={[styles.quoteTypeText, quoteType === 'INSPECTION' && styles.quoteTypeTextActive]}>
                  Inspection visit
                </Text>
              </TouchableOpacity>
            </View>
            {quoteType === 'INSPECTION' ? (
              <>
                {myQuote?.status === 'REJECTED' ? (
                  <View style={styles.rejectedQuoteBanner}>
                    <Text style={styles.rejectedQuoteTitle}>Quote declined</Text>
                    <Text style={styles.rejectedQuoteText}>
                      The customer rejected your inspection fee. Update the amount below and submit again — they’ll
                      see the new quote in their app.
                    </Text>
                  </View>
                ) : myQuote ? (
                  <Text style={styles.quoteStatus}>Status: {quoteStatusLabel(myQuote.status)}</Text>
                ) : null}
                <Text style={styles.inspectionHint}>
                  Charge a diagnosis fee to visit and inspect. You’ll submit the full repair quote after the on-site
                  check.
                </Text>
                <Input
                  label="Inspection / diagnosis fee (₦)"
                  value={labourCost}
                  onChangeText={setLabourCost}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.quoteMessageInput}
                  value={quoteMessage}
                  onChangeText={setQuoteMessage}
                  placeholder="Optional note (e.g. when you can visit)..."
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                />
                <Button
                  title={myQuote ? 'Update inspection quote' : 'Submit inspection quote'}
                  onPress={submitQuote}
                  loading={submittingQuote || updatingQuote}
                />
              </>
            ) : myQuote ? (
              <View style={styles.quoteBlock}>
                {myQuote.status === 'REJECTED' ? (
                  <View style={styles.rejectedQuoteBanner}>
                    <Text style={styles.rejectedQuoteTitle}>Quote declined</Text>
                    <Text style={styles.rejectedQuoteText}>
                      The customer rejected this quote. Adjust your price below and tap Update quote to send it again.
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.quotePrice}>₦{Number(myQuote.proposedPrice).toLocaleString()}</Text>
                <Text style={styles.quoteStatus}>Status: {quoteStatusLabel(myQuote.status)}</Text>
                {myQuote.status === 'PENDING' || myQuote.status === 'REJECTED' ? (
                  <>
                    <Input label="Parts (₦)" value={partsCost} onChangeText={setPartsCost} keyboardType="decimal-pad" />
                    <Input label="Labour (₦)" value={labourCost} onChangeText={setLabourCost} keyboardType="decimal-pad" />
                    <Input label="Other (₦)" value={otherFees} onChangeText={setOtherFees} keyboardType="decimal-pad" />
                    <Text style={styles.costTotal}>Total: ₦{quoteTotal().toLocaleString()}</Text>
                    <Button title="Update quote" onPress={updateQuote} loading={updatingQuote} />
                  </>
                ) : null}
              </View>
            ) : (
              <>
                <Input label="Parts (₦)" value={partsCost} onChangeText={setPartsCost} keyboardType="decimal-pad" />
                <Input label="Labour (₦)" value={labourCost} onChangeText={setLabourCost} keyboardType="decimal-pad" />
                <Input label="Other (₦)" value={otherFees} onChangeText={setOtherFees} keyboardType="decimal-pad" />
                <Text style={styles.costTotal}>Total: ₦{quoteTotal().toLocaleString()}</Text>
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
            <Text style={styles.clarificationHint}>
              Up to 3 questions per job. Answers appear here for all mechanics on open jobs.
            </Text>
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
  quoteStatus: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 8 },
  rejectedQuoteBanner: {
    backgroundColor: colors.statusBadge?.requested?.bg ?? '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  rejectedQuoteTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  rejectedQuoteText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inspectionPaymentStatus: {
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  inspectionPaymentStatusTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  inspectionPaymentStatusPaid: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.primary[700],
    lineHeight: 18,
  },
  inspectionPaymentStatusPending: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
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
  quoteTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  quoteTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  quoteTypePillActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.primary[50],
  },
  quoteTypeText: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
  quoteTypeTextActive: { color: colors.brand.primary, fontFamily: fonts.semiBold },
  inspectionHint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  clarificationHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.neutral[500],
    marginBottom: 8,
    lineHeight: 18,
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
  costBreakdownBlock: { marginTop: 16, gap: 4 },
  costBreakdownTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.neutral[800], marginBottom: 8 },
  costTotal: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.primary[700], marginVertical: 8 },
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
