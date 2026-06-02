import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { getBreakdownDisplay } from '../../utils/priceBreakdownDisplay'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export type PriceBreakdownLines = {
  partsNaira: number
  labourNaira: number
  otherFeesNaira: number
  totalNaira: number
  inspectionPaidNaira?: number
  balanceDueNaira?: number
  previouslyAgreedNaira?: number
  labourLabel?: string
  totalLabel?: string
}

/** Build breakdown lines from a mechanic's bid while the job is still REQUESTED. */
export function quoteToPriceBreakdownLines(quote: {
  quoteType?: string
  customerTotalNaira?: number | null
  proposedPrice?: number | null
  partsNaira?: number | null
  labourNaira?: number | null
  otherFeesNaira?: number | null
}): PriceBreakdownLines | null {
  const total = Number(quote.customerTotalNaira ?? quote.proposedPrice ?? 0)
  if (!total || total <= 0) return null
  const isInspection = quote.quoteType === 'INSPECTION'
  if (isInspection) {
    return {
      partsNaira: 0,
      labourNaira: total,
      otherFeesNaira: 0,
      totalNaira: total,
      labourLabel: 'Inspection / diagnosis fee',
      totalLabel: 'Inspection fee total',
    }
  }
  return {
    partsNaira: Number(quote.partsNaira ?? 0),
    labourNaira: Number(quote.labourNaira ?? 0),
    otherFeesNaira: Number(quote.otherFeesNaira ?? 0),
    totalNaira: total,
    totalLabel: 'Quote total',
  }
}

function fmt(n: number) {
  return `₦${Number(n).toLocaleString()}`
}

type Props = {
  lines: PriceBreakdownLines
  defaultOpen?: boolean
  title?: string
  hint?: string
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold, accent && styles.rowValueAccent]}>{value}</Text>
    </View>
  )
}

export function CustomerPriceBreakdown({
  lines,
  defaultOpen = false,
  title = 'Price breakdown',
  hint,
}: Props) {
  const display = getBreakdownDisplay(lines)
  const totalLabel = lines.totalLabel ?? 'Repair total'
  const [open, setOpen] = useState(defaultOpen || !display.collapsible)
  const resolvedHint =
    hint ??
    (display.mode === 'single_total'
      ? undefined
      : 'Review each line before you accept or pay.')

  const headerSubtitle =
    display.mode === 'detailed'
      ? `${display.rows.length} cost lines · ${fmt(lines.totalNaira)}`
      : display.mode === 'single_total'
        ? fmt(lines.totalNaira)
        : `${fmt(lines.totalNaira)} total`

  const body = (
    <View style={styles.body}>
      {resolvedHint ? <Text style={styles.hint}>{resolvedHint}</Text> : null}
      {display.footnote ? <Text style={styles.footnote}>{display.footnote}</Text> : null}
      {lines.previouslyAgreedNaira != null && lines.previouslyAgreedNaira > 0 ? (
        <Row label="Previously agreed" value={fmt(lines.previouslyAgreedNaira)} />
      ) : null}
      {display.rows.map((row) => (
        <Row
          key={row.label}
          label={row.label}
          value={fmt(row.valueNaira)}
          bold={row.bold}
        />
      ))}
      {display.mode !== 'single_total' &&
      !(
        display.rows.length === 1 &&
        Math.abs(display.rows[0].valueNaira - lines.totalNaira) < 1
      ) ? (
        <>
          <View style={styles.divider} />
          <Row label={totalLabel} value={fmt(lines.totalNaira)} bold />
        </>
      ) : null}
      {lines.inspectionPaidNaira != null && lines.inspectionPaidNaira > 0 ? (
        <Row label="Minus inspection paid" value={`−${fmt(lines.inspectionPaidNaira)}`} accent />
      ) : null}
      {lines.balanceDueNaira != null && lines.balanceDueNaira >= 0 ? (
        <>
          <View style={styles.divider} />
          <Row label="Amount you pay" value={fmt(lines.balanceDueNaira)} bold accent />
        </>
      ) : null}
    </View>
  )

  if (!display.collapsible) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.staticTitle}>{title}</Text>
        {body}
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          setOpen((v) => !v)
        }}
        activeOpacity={0.8}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.headerSub}>{headerSubtitle}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.neutral[500]} />
      </TouchableOpacity>
      {open ? body : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  staticTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerText: { flex: 1, marginRight: 8 },
  title: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  headerSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  body: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral[500], marginBottom: 8, marginTop: 4 },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral[600],
    lineHeight: 17,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  rowLabelBold: { fontFamily: fonts.semiBold, color: colors.text },
  rowValue: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  rowValueBold: { fontFamily: fonts.semiBold },
  rowValueAccent: { color: colors.primary[700] },
  divider: { height: 1, backgroundColor: colors.neutral[200], marginVertical: 8 },
})
