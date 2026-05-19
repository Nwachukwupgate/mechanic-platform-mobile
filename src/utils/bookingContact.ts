export function canShowBookingContactPhone(booking: { status?: string } | null | undefined): boolean {
  return Boolean(booking?.status && booking.status !== 'REQUESTED')
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
