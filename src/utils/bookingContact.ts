type BookingContactGate = {
  status?: string
  mechanicId?: string | null
  acceptedQuoteId?: string | null
  acceptedQuote?: { quoteType?: string } | null
  inspectionPaidAt?: string | Date | null
}

/** Phone numbers unlock after the customer accepts/pays the mechanic's fee (standard quote or inspection). */
export function canShowBookingContactPhone(
  booking: BookingContactGate | null | undefined,
): boolean {
  if (!booking?.mechanicId) return false
  if (booking.status === 'REQUESTED') return false

  const isInspection = booking.acceptedQuote?.quoteType === 'INSPECTION'
  if (isInspection) {
    return Boolean(booking.inspectionPaidAt)
  }

  return Boolean(booking.acceptedQuoteId)
}

export function customerPhone(u: unknown): string | undefined {
  if (!u || typeof u !== 'object') return undefined
  const user = u as Record<string, unknown>
  const p =
    user.profile && typeof user.profile === 'object'
      ? (user.profile as Record<string, unknown>)
      : null
  const raw =
    user.phone ??
    user.phoneNumber ??
    user.mobile ??
    user.contactPhone ??
    p?.phone ??
    p?.phoneNumber ??
    p?.mobile
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
}

export function mechanicPhone(m: unknown): string | undefined {
  if (!m || typeof m !== 'object') return undefined
  const mech = m as Record<string, unknown>
  const p =
    mech.profile && typeof mech.profile === 'object'
      ? (mech.profile as Record<string, unknown>)
      : null
  const raw =
    mech.phone ??
    mech.phoneNumber ??
    mech.mobile ??
    mech.contactPhone ??
    mech.workshopPhone ??
    mech.ownerPhone ??
    p?.phone ??
    p?.phoneNumber ??
    p?.mobile
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
}
