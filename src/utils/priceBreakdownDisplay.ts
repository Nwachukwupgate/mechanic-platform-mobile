import type { PriceBreakdownLines } from '../components/bookingDetail/CustomerPriceBreakdown'

export type BreakdownDisplayMode = 'detailed' | 'single_total' | 'partial'

export type BreakdownDisplayRow = {
  label: string
  valueNaira: number
  bold?: boolean
}

export function analyzePriceBreakdown(
  lines: Pick<PriceBreakdownLines, 'partsNaira' | 'labourNaira' | 'otherFeesNaira' | 'totalNaira'>,
) {
  const parts = Number(lines.partsNaira) || 0
  const labour = Number(lines.labourNaira) || 0
  const other = Number(lines.otherFeesNaira) || 0
  const total = Number(lines.totalNaira) || 0
  const detailSum = parts + labour + other
  const filledCount = [parts, labour, other].filter((n) => n > 0).length

  return {
    parts,
    labour,
    other,
    total,
    detailSum,
    filledCount,
    isSingleTotal: filledCount === 0 && total > 0,
    hasUnallocated: detailSum > 0 && total > detailSum + 0.5,
    unallocatedNaira: detailSum > 0 && total > detailSum ? total - detailSum : 0,
  }
}

export function getBreakdownDisplay(
  lines: PriceBreakdownLines,
): {
  mode: BreakdownDisplayMode
  rows: BreakdownDisplayRow[]
  footnote?: string
  collapsible: boolean
} {
  const labourLabel = lines.labourLabel ?? 'Labour / workmanship'
  const totalLabel = lines.totalLabel ?? 'Repair total'
  const a = analyzePriceBreakdown(lines)

  if (a.isSingleTotal) {
    return {
      mode: 'single_total',
      collapsible: false,
      rows: [{ label: totalLabel, valueNaira: a.total, bold: true }],
      footnote:
        'This quote is one total only. Message the mechanic in chat if you want parts and labour listed separately.',
    }
  }

  const rows: BreakdownDisplayRow[] = []
  if (a.parts > 0) rows.push({ label: 'Parts / materials', valueNaira: a.parts })
  if (a.labour > 0) rows.push({ label: labourLabel, valueNaira: a.labour })
  if (a.other > 0) rows.push({ label: 'Other fees', valueNaira: a.other })
  if (a.hasUnallocated) {
    rows.push({ label: 'Package / balance (not itemized)', valueNaira: a.unallocatedNaira })
  }

  const mode: BreakdownDisplayMode =
    rows.length >= 2 ? 'detailed' : rows.length === 1 ? 'partial' : 'single_total'

  return {
    mode,
    collapsible: mode !== 'single_total',
    rows,
    footnote:
      mode === 'partial'
        ? 'Only one cost line was provided. The total below is what you would pay.'
        : undefined,
  }
}

/** Standard repair quotes must include labour (platform fee base). */
export function isLabourMissing(labour: number): boolean {
  return (Number(labour) || 0) <= 0
}

export const LABOUR_REQUIRED_MESSAGE =
  'Labour / workmanship is required. Platform fees are calculated on labour only. Parts and other fees alone are not accepted.'
