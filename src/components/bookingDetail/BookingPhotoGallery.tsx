import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'

type Props = {
  photoUrls: string[]
  title?: string
  subtitle?: string
  emptyHint?: string
}

export function BookingPhotoGallery({
  photoUrls,
  title = 'Issue photos',
  subtitle = 'Tap any photo to open full screen',
  emptyHint = 'No photos were added for this issue.',
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const currentUrl = useMemo(
    () => (openIndex != null ? photoUrls[openIndex] ?? null : null),
    [openIndex, photoUrls]
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {photoUrls.length > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {photoUrls.length} photo{photoUrls.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {photoUrls.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {photoUrls.map((url, idx) => (
            <TouchableOpacity
              key={`${url}-${idx}`}
              style={styles.thumbWrap}
              activeOpacity={0.85}
              onPress={() => setOpenIndex(idx)}
            >
              <Image source={{ uri: url }} style={styles.thumb} />
              <View style={styles.thumbOverlay}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={18} color={colors.neutral[500]} />
          <Text style={styles.emptyText}>{emptyHint}</Text>
        </View>
      )}

      <Modal
        visible={openIndex != null && !!currentUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setOpenIndex(null)}
            accessibilityLabel="Close image"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {currentUrl ? <Image source={{ uri: currentUrl }} style={styles.modalImage} /> : null}

          {photoUrls.length > 1 ? (
            <>
              <TouchableOpacity
                style={[styles.navBtn, styles.navLeft]}
                onPress={() =>
                  setOpenIndex((prev) =>
                    prev == null ? 0 : (prev - 1 + photoUrls.length) % photoUrls.length
                  )
                }
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, styles.navRight]}
                onPress={() =>
                  setOpenIndex((prev) =>
                    prev == null ? 0 : (prev + 1) % photoUrls.length
                  )
                }
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </>
          ) : null}

          {openIndex != null ? (
            <Text style={styles.modalCounter}>
              {openIndex + 1} / {photoUrls.length}
            </Text>
          ) : null}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  subtitle: { fontSize: 12, fontFamily: fonts.regular, color: colors.neutral[500], marginTop: 4 },
  countPill: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontSize: 11, color: colors.primary[700], fontFamily: fonts.semiBold },
  row: { gap: 10, paddingTop: 10, paddingBottom: 2 },
  thumbWrap: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  thumb: { width: '100%', height: '100%' },
  thumbOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 999,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral[300],
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral[50],
  },
  emptyText: { fontSize: 13, color: colors.neutral[600], fontFamily: fonts.regular },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalClose: {
    position: 'absolute',
    top: 54,
    right: 18,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: { width: '100%', height: '74%', resizeMode: 'contain' },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: { left: 16 },
  navRight: { right: 16 },
  modalCounter: {
    position: 'absolute',
    bottom: 44,
    color: '#fff',
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
})

