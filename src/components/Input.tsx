import React, { useState } from 'react'
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'
import { InfoHint } from './InfoHint'

type Props = TextInputProps & {
  label?: string
  /** When set, an info icon appears next to the label; tap for this explanation. */
  hint?: string
  /** Modal title when `hint` is set; defaults to `label` or "Details". */
  hintTitle?: string
  error?: string
  showPasswordToggle?: boolean
}

export function Input({
  label,
  hint,
  hintTitle,
  error,
  style,
  showPasswordToggle,
  secureTextEntry,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false)
  const isPasswordVisible = showPasswordToggle ? visible : true
  const secure = showPasswordToggle ? !visible : !!secureTextEntry

  const hintTitleResolved = hintTitle ?? (label ? String(label) : 'Details')

  return (
    <View style={styles.wrap}>
      {label && !hint ? <Text style={styles.label}>{label}</Text> : null}
      {label && hint ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, styles.labelInRow]}>{label}</Text>
          <InfoHint title={hintTitleResolved} message={hint} iconSize={20} />
        </View>
      ) : null}
      {!label && hint ? (
        <View style={styles.labelRowEnd}>
          <InfoHint title={hintTitleResolved} message={hint} iconSize={20} />
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.neutral[400]}
          style={[styles.input, error ? styles.inputError : null, showPasswordToggle ? styles.inputWithIcon : null, style]}
          secureTextEntry={secure}
          {...props}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setVisible((v) => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.neutral[500]}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 6 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  labelInRow: { flex: 1, marginBottom: 0 },
  labelRowEnd: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  inputRow: { position: 'relative' },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWithIcon: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  inputError: { borderColor: colors.accent.red },
  error: { fontSize: 12, fontFamily: fonts.regular, color: colors.accent.red, marginTop: 4 },
})
