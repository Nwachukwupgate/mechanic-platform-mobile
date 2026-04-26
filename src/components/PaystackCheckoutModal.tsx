import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

/** Parse Paystack callback / redirect URLs for `reference` or `trxref`. */
export function extractPaystackReferenceFromUrl(url: string): string | null {
  if (!url || url === 'about:blank') return null
  try {
    const u = new URL(url)
    const r = u.searchParams.get('reference') || u.searchParams.get('trxref')
    if (r) return decodeURIComponent(r).trim()
  } catch {
    // non-standard URL
  }
  const m =
    url.match(/[?&#]reference=([^&#'"]+)/i) || url.match(/[?&#]trxref=([^&#'"]+)/i)
  if (!m?.[1]) return null
  try {
    return decodeURIComponent(m[1].trim())
  } catch {
    return m[1].trim()
  }
}

type Props = {
  visible: boolean
  authorizationUrl: string | null
  expectedReference: string | null
  title?: string
  onRequestClose: () => void
  verifyPayment: (reference: string) => Promise<{ data?: { success?: boolean } }>
  onVerified: () => void | Promise<void>
}

export function PaystackCheckoutModal({
  visible,
  authorizationUrl,
  expectedReference,
  title = 'Complete payment',
  onRequestClose,
  verifyPayment,
  onVerified,
}: Props) {
  const insets = useSafeAreaInsets()
  const verifyInFlight = useRef(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (visible) verifyInFlight.current = false
  }, [visible, authorizationUrl])

  const maybeComplete = useCallback(
    async (url: string) => {
      const ref = extractPaystackReferenceFromUrl(url)
      if (!ref || !expectedReference || ref !== expectedReference) return
      if (verifyInFlight.current) return
      verifyInFlight.current = true
      setVerifying(true)
      try {
        const r = await verifyPayment(ref)
        if (r.data?.success) {
          await onVerified()
          onRequestClose()
        }
      } catch {
        // User can retry after Paystack finishes redirect; ref still valid
      } finally {
        verifyInFlight.current = false
        setVerifying(false)
      }
    },
    [expectedReference, onRequestClose, onVerified, verifyPayment]
  )

  const onNavChange = useCallback(
    (nav: { url: string }) => {
      void maybeComplete(nav.url)
    },
    [maybeComplete]
  )

  if (!visible || !authorizationUrl) return null

  // iOS: avoid `fullScreen` here — Fabric + react-native-screens can crash in
  // RNSModalScreenShadowNode::getContentOriginOffset when a RN Modal stacks on a native stack.
  const modalPresentation =
    Platform.OS === 'ios' ? ('pageSheet' as const) : ('fullScreen' as const)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={modalPresentation}
      onRequestClose={onRequestClose}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onRequestClose} hitSlop={12} accessibilityLabel="Close payment">
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.webWrap}>
        {verifying ? (
          <View style={styles.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={styles.overlayText}>Confirming payment…</Text>
          </View>
        ) : null}
        <WebView
          source={{ uri: authorizationUrl }}
          style={styles.webview}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={(req) => {
            void maybeComplete(req.url)
            return true
          }}
          startInLoadingState
          originWhitelist={['https://*', 'http://*']}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 8,
    textAlign: 'center',
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  webWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: colors.background },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface + 'ee',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  overlayText: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
  },
})
