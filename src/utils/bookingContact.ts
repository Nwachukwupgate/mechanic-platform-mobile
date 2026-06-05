type BookingContactGate = {
  status?: string
  mechanicId?: string | null
  acceptedQuoteId?: string | null
  acceptedQuote?: { quoteType?: string } | null
  inspectionPaidAt?: string | Date | null
}

const ACTIVE_CONTACT_STATUSES = new Set(['ACCEPTED', 'IN_PROGRESS'])

/** Phone unlocks after fee acceptance and only while the job is active (not after work concludes). */
export function canShowBookingContactPhone(
  booking: BookingContactGate | null | undefined,
): boolean {
  if (!booking?.mechanicId) return false
  if (!booking.status || !ACTIVE_CONTACT_STATUSES.has(booking.status)) return false

  const isInspection = booking.acceptedQuote?.quoteType === 'INSPECTION'
  if (isInspection) {
    return Boolean(booking.inspectionPaidAt)
  }

  return Boolean(booking.acceptedQuoteId)
}

const CONCLUDED_STATUSES = new Set(['DONE', 'PAID', 'DELIVERED', 'EXPIRED'])

export function bookingContactLockedHint(
  booking: BookingContactGate | null | undefined,
  role: 'mechanic' | 'customer',
): string | null {
  if (!booking?.mechanicId || canShowBookingContactPhone(booking)) return null
  const party = role === 'mechanic' ? 'Customer' : 'Mechanic'
  if (booking.status && CONCLUDED_STATUSES.has(booking.status)) {
    return `${party} phone is no longer available after the job is concluded.`
  }
  const isInspection = booking.acceptedQuote?.quoteType === 'INSPECTION'
  if (isInspection && !booking.inspectionPaidAt) {
    return role === 'mechanic'
      ? 'Customer phone unlocks after they pay the inspection fee.'
      : 'Mechanic phone unlocks after you pay the inspection fee.'
  }
  if (booking.status === 'REQUESTED' || !booking.acceptedQuoteId) {
    return role === 'mechanic'
      ? 'Customer phone unlocks after they accept your quote.'
      : 'Mechanic phone unlocks after you accept their quote.'
  }
  return null
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
