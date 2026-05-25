export const MIN_PHOTOS_VAGUE_FAULT = 2
export const RECOMMENDED_JOB_PHOTOS = 2

export function isVagueFaultName(faultName: string | undefined | null): boolean {
  const n = (faultName ?? '').toLowerCase()
  return n.includes('other mechanical') || n.includes('other electrical')
}

export function validateJobPostingInput(opts: {
  description: string
  photoCount: number
  faultName: string | undefined
  isOpenBoard: boolean
}): string | null {
  if (opts.isOpenBoard && isVagueFaultName(opts.faultName) && opts.photoCount < MIN_PHOTOS_VAGUE_FAULT) {
    return `Add at least ${MIN_PHOTOS_VAGUE_FAULT} clear photos for this type of issue.`
  }

  if (
    opts.isOpenBoard &&
    !isVagueFaultName(opts.faultName) &&
    opts.photoCount < RECOMMENDED_JOB_PHOTOS
  ) {
    return `We recommend at least ${RECOMMENDED_JOB_PHOTOS} photos so mechanics can quote more accurately. Add photos or continue anyway?`
  }

  return null
}

export function isQuoteInspection(quote: { quoteType?: string } | null | undefined): boolean {
  return quote?.quoteType === 'INSPECTION'
}

export function quoteTypeLabel(quote: { quoteType?: string } | null | undefined): string {
  return isQuoteInspection(quote) ? 'Inspection visit' : 'Repair quote'
}

export function quoteSummaryLine(quote: {
  quoteType?: string
  customerTotalNaira?: number
  proposedPrice?: number
}): string {
  const amount = Number(quote.customerTotalNaira ?? quote.proposedPrice ?? 0).toLocaleString()
  if (isQuoteInspection(quote)) {
    return `Inspection visit · ₦${amount} (full repair quote after on-site check)`
  }
  return `₦${amount} total`
}
