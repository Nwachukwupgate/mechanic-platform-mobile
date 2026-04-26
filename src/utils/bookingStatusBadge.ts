import { colors } from '../theme/colors'

const S = colors.statusBadge

export function bookingStatusBadgeColors(status: string | undefined) {
  switch (status) {
    case 'REQUESTED':
      return S.requested
    case 'ACCEPTED':
      return S.accepted
    case 'IN_PROGRESS':
      return S.inProgress
    case 'DONE':
      return S.done
    case 'PAID':
      return S.paid
    case 'DELIVERED':
      return S.delivered
    case 'EXPIRED':
      return S.expired
    default:
      return S.unknown
  }
}

export function bookingStatusLabel(status: string | undefined) {
  const raw = (status ?? 'Unknown').replace(/_/g, ' ').toLowerCase()
  return raw.replace(/\b\w/g, (c) => c.toUpperCase())
}
