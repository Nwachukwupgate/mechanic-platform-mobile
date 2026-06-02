export type WhatsNextTone = 'action' | 'waiting' | 'review' | 'neutral'

export type CustomerWhatsNext = {
  title: string
  body: string
  tone: WhatsNextTone
  stepLabel?: string
}

export function buildCustomerWhatsNext(input: {
  status: string
  pendingQuoteCount: number
  hasAssignedMechanic: boolean
  assignedMechanicName?: string
  paymentSummary?: {
    phase?: string
    isInspectionFlow?: boolean
    canPayInspection?: boolean
    canPayRepairBalance?: boolean
    canPayStandard?: boolean
    inspectionFeeNaira?: number
    inspectionPaidNaira?: number
    balanceDueNaira?: number
    repairTotalNaira?: number
  } | null
  showAcceptRepairInvoice: boolean
  paidAt?: string | null
}): CustomerWhatsNext | null {
  const ps = input.paymentSummary
  const fmt = (n: number) => `₦${Number(n).toLocaleString()}`

  if (input.showAcceptRepairInvoice) {
    const balance = ps?.balanceDueNaira != null ? Number(ps.balanceDueNaira) : null
    return {
      title: ps?.isInspectionFlow ? 'Review full repair quote' : 'Review updated job cost',
      body:
        balance != null && balance > 0
          ? `Your mechanic sent a new breakdown. Accept or decline below. If you accept, you pay ${fmt(balance)}.`
          : 'Your mechanic sent an updated price. Accept or decline below before work continues.',
      tone: 'review',
      stepLabel: ps?.isInspectionFlow ? 'Step 2 of 2' : undefined,
    }
  }

  if (ps?.phase === 'awaiting_repair_invoice') {
    return {
      title: 'Waiting on your mechanic',
      body: ps.isInspectionFlow
        ? 'After the visit they will send the full repair quote with parts and labour.'
        : 'They will send an updated cost breakdown when the scope is clear.',
      tone: 'waiting',
      stepLabel: ps.isInspectionFlow ? 'Step 2 of 2' : undefined,
    }
  }

  if (ps?.canPayInspection) {
    const fee = Number(ps.inspectionFeeNaira ?? 0)
    return {
      title: 'Pay inspection fee',
      body:
        fee > 0
          ? `Pay ${fmt(fee)} so your mechanic can visit, diagnose, and send the full repair quote.`
          : 'Pay the inspection fee so your mechanic can visit and diagnose the issue.',
      tone: 'action',
      stepLabel: 'Step 1 of 2',
    }
  }

  if (ps?.canPayRepairBalance) {
    const due = Number(ps.balanceDueNaira ?? 0)
    return {
      title: 'Pay repair balance',
      body: due > 0 ? `You accepted the repair quote. Pay ${fmt(due)} to continue.` : 'Complete payment for the repair.',
      tone: 'action',
      stepLabel: ps?.isInspectionFlow ? 'Step 2 of 2' : undefined,
    }
  }

  if (ps?.canPayStandard) {
    return {
      title: 'Pay for this job',
      body: 'Your agreed price is ready. Pay in the app or mark if you paid the mechanic directly.',
      tone: 'action',
    }
  }

  if (input.status === 'REQUESTED') {
    if (input.pendingQuoteCount > 0) {
      const n = input.pendingQuoteCount
      return {
        title: n === 1 ? 'Review your quote' : `Compare ${n} quotes`,
        body:
          n === 1
            ? 'Open the breakdown, then tap Accept when you are happy with this mechanic.'
            : 'Check each mechanic’s breakdown and message, then Accept the one you want.',
        tone: 'action',
      }
    }
    if (input.hasAssignedMechanic) {
      return {
        title: 'Waiting for a quote',
        body: `${input.assignedMechanicName ?? 'Your mechanic'} has not sent a price yet. You can call them from this screen.`,
        tone: 'waiting',
      }
    }
    return {
      title: 'Waiting for quotes',
      body: 'Mechanics can bid on your job. Quotes and breakdowns will show here when they arrive.',
      tone: 'waiting',
    }
  }

  if (input.status === 'DONE' && !input.paidAt) {
    return {
      title: 'Job marked done',
      body: 'Pay when you are satisfied with the work, or confirm if you already paid cash.',
      tone: 'action',
    }
  }

  if (input.status === 'ACCEPTED' && ps?.inspectionPaidNaira && ps.isInspectionFlow) {
    return {
      title: 'Inspection paid',
      body: 'Your mechanic can visit. You will review the full repair quote here after the check.',
      tone: 'neutral',
      stepLabel: 'Step 1 of 2 done',
    }
  }

  if (input.status === 'IN_PROGRESS') {
    return {
      title: 'Work in progress',
      body: 'Stay in touch with your mechanic in Messages below.',
      tone: 'neutral',
    }
  }

  return null
}
