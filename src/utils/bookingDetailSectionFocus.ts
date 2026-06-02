export type BookingDetailSectionFocus = {
  jobDetails: boolean
  quotes: boolean
  qa: boolean
  locationAndSupport: boolean
  chat: boolean
}

export function getBookingDetailSectionFocus(input: {
  status: string
  pendingQuoteCount: number
  unansweredClarificationCount: number
  paymentPhase?: string | null
  hasActivePayment: boolean
  showAcceptRepairInvoice: boolean
  chatReleased: boolean
}): BookingDetailSectionFocus {
  const needsQuoteAttention =
    input.status === 'REQUESTED' && (input.pendingQuoteCount > 0 || input.unansweredClarificationCount > 0)
  const needsPaymentAttention =
    input.hasActivePayment || input.showAcceptRepairInvoice || input.paymentPhase === 'review_repair_invoice'
  const waitingOnMechanic = input.paymentPhase === 'awaiting_repair_invoice'

  if (needsQuoteAttention) {
    return {
      jobDetails: input.pendingQuoteCount === 0 && input.unansweredClarificationCount === 0,
      quotes: input.pendingQuoteCount > 0,
      qa: input.unansweredClarificationCount > 0,
      locationAndSupport: false,
      chat: false,
    }
  }

  if (needsPaymentAttention || waitingOnMechanic) {
    return {
      jobDetails: false,
      quotes: false,
      qa: false,
      locationAndSupport: input.status === 'ACCEPTED' || input.status === 'IN_PROGRESS',
      chat: input.chatReleased,
    }
  }

  if (input.status === 'REQUESTED') {
    return {
      jobDetails: true,
      quotes: true,
      qa: input.unansweredClarificationCount > 0,
      locationAndSupport: false,
      chat: false,
    }
  }

  return {
    jobDetails: false,
    quotes: false,
    qa: false,
    locationAndSupport: false,
    chat: input.chatReleased,
  }
}
