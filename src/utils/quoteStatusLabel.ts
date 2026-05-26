export function quoteStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'PENDING':
      return 'Pending — waiting for customer'
    case 'ACCEPTED':
      return 'Accepted by customer'
    case 'REJECTED':
      return 'Declined by customer'
    case 'WITHDRAWN':
      return 'Withdrawn'
    default:
      return status?.replace(/_/g, ' ') ?? 'Unknown'
  }
}
