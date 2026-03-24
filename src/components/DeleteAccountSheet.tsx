import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'
import { Button } from './Button'
import { USER_DELETE_REASON_OPTIONS } from '../constants/deleteAccountReasons'

type Props = {
  visible: boolean
  onClose: () => void
  onConfirm: (payload: { reasons: string[]; otherReason?: string }) => Promise<void>
  loading?: boolean
}

export function DeleteAccountSheet({ visible, onClose, onConfirm, loading }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [otherText, setOtherText] = useState('')
  const [step, setStep] = useState<'reasons' | 'confirm'>('reasons')

  const toggle = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSelected(new Set())
    setOtherText('')
    setStep('reasons')
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const reasonsPayload = () => {
    const reasons = USER_DELETE_REASON_OPTIONS.filter(
      (o) => selected.has(o.value) && o.value !== 'other'
    ).map((o) => o.label)
    const otherReason = selected.has('other') ? otherText.trim() : undefined
    return { reasons, otherReason }
  }

  const canProceed = () => {
    const { reasons, otherReason } = reasonsPayload()
    if (reasons.length === 0 && !otherReason) return false
    if (selected.has('other') && !otherText.trim()) return false
    return true
  }

  const goConfirm = () => {
    if (!canProceed()) return
    setStep('confirm')
  }

  const submit = async () => {
    const { reasons, otherReason } = reasonsPayload()
    await onConfirm({ reasons, otherReason })
    reset()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {step === 'reasons' ? 'Delete account' : 'Confirm deletion'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={26} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {step === 'reasons' ? (
            <>
              <Text style={styles.lead}>
                We’re sorry to see you go. Tell us why you’re leaving — it helps us improve.
              </Text>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {USER_DELETE_REASON_OPTIONS.map((opt) => {
                  const isOn = selected.has(opt.value)
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.row, isOn && styles.rowOn]}
                      onPress={() => toggle(opt.value)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.checkbox, isOn && styles.checkboxOn]}>
                        {isOn ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                      </View>
                      <Text style={styles.rowLabel}>{opt.label}</Text>
                    </TouchableOpacity>
                  )
                })}
                {selected.has('other') ? (
                  <TextInput
                    style={styles.otherInput}
                    placeholder="Please tell us more…"
                    placeholderTextColor={colors.neutral[400]}
                    value={otherText}
                    onChangeText={setOtherText}
                    multiline
                    maxLength={500}
                  />
                ) : null}
              </ScrollView>
              <Text style={styles.warning}>
                This permanently deletes your profile, vehicles, and booking history. This cannot be undone.
              </Text>
              <Button title="Continue" onPress={goConfirm} disabled={!canProceed()} />
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="warning" size={40} color={colors.accent.red} />
              </View>
              <Text style={styles.confirmTitle}>Delete your account?</Text>
              <Text style={styles.confirmBody}>
                Your account and personal data will be removed from our systems. Active bookings may be
                cancelled.
              </Text>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.dangerBtnText}>{loading ? 'Deleting…' : 'Yes, delete my account'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('reasons')} disabled={loading}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[200],
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  scroll: { maxHeight: 320 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: 10,
    backgroundColor: colors.neutral[50],
  },
  rowOn: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  otherInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 88,
    color: colors.text,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  warning: {
    fontSize: 13,
    color: '#b91c1c',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 19,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  backText: { fontSize: 16, fontWeight: '600', color: colors.primary[600] },
  confirmIconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },
  dangerBtn: {
    backgroundColor: colors.accent.red,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
