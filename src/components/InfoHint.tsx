import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

export type InfoHintProps = {
  /** Shown in the modal header and for accessibility. */
  title?: string
  /** Body copy shown in the modal (can be several sentences). */
  message: string
  iconSize?: number
  iconColor?: string
}

/**
 * Tap the info icon to open a short explanation modal. Use next to labels, totals, or anywhere
 * users may need on-demand context without cluttering the screen.
 */
export function InfoHint({
  title = 'Details',
  message,
  iconSize = 20,
  iconColor = colors.neutral[500],
}: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const { height: winH } = useWindowDimensions()
  const sheetMaxH = Math.min(winH * 0.78, 520)

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`More information: ${title}`}
        style={styles.iconTouch}
      >
        <Ionicons name="information-circle-outline" size={iconSize} color={iconColor} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        accessibilityViewIsModal
      >
        <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Dismiss" />
          <View style={[styles.sheet, { maxHeight: sheetMaxH }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {title}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.body}>{message}</Text>
            </ScrollView>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Got it"
            >
              <Text style={styles.primaryBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  iconTouch: { justifyContent: 'center', alignItems: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.headingBold,
    color: colors.text,
    lineHeight: 24,
  },
  closeBtn: { marginTop: -4 },
  bodyScroll: { marginHorizontal: -4 },
  bodyScrollContent: { paddingHorizontal: 4, paddingBottom: 8 },
  body: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
})
