import React from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'
import type { PartLineItem } from '../types/partLineItems'
import { emptyPartLine, sumPartLines } from '../types/partLineItems'

type Props = {
  items: PartLineItem[]
  onChange: (items: PartLineItem[]) => void
  onPartsTotalChange: (totalNaira: number) => void
}

export function PartLineItemsEditor({ items, onChange, onPartsTotalChange }: Props) {
  const rows = items.length ? items : [emptyPartLine()]

  const update = (next: PartLineItem[]) => {
    onChange(next)
    onPartsTotalChange(sumPartLines(next))
  }

  const patchRow = (index: number, patch: Partial<PartLineItem>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    update(next)
  }

  const addRow = () => update([...rows, emptyPartLine()])

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    update(next.length ? next : [emptyPartLine()])
  }

  const partsTotal = sumPartLines(rows)

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Parts & materials</Text>
      <Text style={styles.hint}>
        Name each part, its price, and why (brand, qty, condition). The customer sees every line; we add the total for you.
      </Text>
      {rows.map((row, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>Part {index + 1}</Text>
            {rows.length > 1 ? (
              <TouchableOpacity onPress={() => removeRow(index)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Front brake pads"
            placeholderTextColor={colors.neutral[400]}
            value={row.name}
            onChangeText={(t) => patchRow(index, { name: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Price (₦)"
            placeholderTextColor={colors.neutral[400]}
            keyboardType="decimal-pad"
            value={row.amountNaira > 0 ? String(row.amountNaira) : ''}
            onChangeText={(t) => patchRow(index, { amountNaira: parseFloat(t) || 0 })}
          />
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Why this part / price (optional)"
            placeholderTextColor={colors.neutral[400]}
            value={row.note ?? ''}
            onChangeText={(t) => patchRow(index, { note: t })}
            multiline
          />
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={addRow}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary[700]} />
        <Text style={styles.addBtnText}>Add another part</Text>
      </TouchableOpacity>
      <Text style={styles.total}>
        Parts subtotal: <Text style={styles.totalBold}>₦{partsTotal.toLocaleString()}</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, marginBottom: 4 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral[600], lineHeight: 17, marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.neutral[50],
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.neutral[600] },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  noteInput: { minHeight: 44 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary[700] },
  total: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  totalBold: { fontFamily: fonts.semiBold, color: colors.text },
})
