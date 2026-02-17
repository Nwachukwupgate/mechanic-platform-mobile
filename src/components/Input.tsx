import React, { useState } from 'react'
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'

type Props = TextInputProps & {
  label?: string
  error?: string
  showPasswordToggle?: boolean
}

export function Input({ label, error, style, showPasswordToggle, secureTextEntry, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const isPasswordVisible = showPasswordToggle ? visible : true
  const secure = showPasswordToggle ? !visible : !!secureTextEntry

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6 },
  inputRow: { position: 'relative' },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWithIcon: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  inputError: { borderColor: colors.accent.red },
  error: { fontSize: 12, color: colors.accent.red, marginTop: 4 },
})
