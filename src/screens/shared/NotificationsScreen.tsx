import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { notificationsAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { layout } from '../../theme/layout'
import { Card } from '../../components/Card'

export type InboxNotification = {
  id: string
  type: string
  title: string
  body: string
  data?: { bookingId?: string; status?: string } | null
  readAt: string | null
  createdAt: string
}

export function NotificationsScreen({ navigation }: { navigation: any }) {
  const role = useAuthStore((s) => s.user?.role)
  const [items, setItems] = useState<InboxNotification[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await notificationsAPI.list({ limit: 50, offset: 0 })
      const payload = res.data as {
        items?: InboxNotification[]
        total?: number
      }
      setItems(Array.isArray(payload.items) ? payload.items : [])
      setTotal(typeof payload.total === 'number' ? payload.total : 0)
    } catch (e) {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      void load()
    }, [load])
  )

  const openItem = async (item: InboxNotification) => {
    try {
      if (!item.readAt) {
        await notificationsAPI.markRead(item.id)
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
        )
      }
    } catch (_) {}

    const bookingId =
      item.data && typeof item.data === 'object' && typeof item.data.bookingId === 'string'
        ? item.data.bookingId
        : undefined
    if (!bookingId) return
    if (role === 'MECHANIC') {
      navigation.getParent()?.navigate('MechanicBookingDetail', { id: bookingId })
    } else {
      navigation.getParent()?.navigate('BookingDetail', { id: bookingId })
    }
  }

  const markAll = async () => {
    try {
      await notificationsAPI.markAllRead()
      await load()
    } catch (_) {}
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarMeta}>
          {total === 0 ? 'No activity yet' : `${total} update${total === 1 ? '' : 's'}`}
        </Text>
        {items.some((n) => !n.readAt) ? (
          <TouchableOpacity onPress={markAll} hitSlop={12} accessibilityRole="button">
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.neutral[400]} />
            <Text style={styles.emptyTitle}>You’re caught up</Text>
            <Text style={styles.emptyText}>
              Quotes, messages, status changes, and payment updates will show here when something
              happens on your jobs.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => void openItem(item)}>
            <Card style={[styles.card, !item.readAt ? styles.cardUnread : undefined]}>
              <View style={styles.cardRow}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={iconForType(item.type, !!item.readAt)}
                    size={22}
                    color={item.readAt ? colors.neutral[500] : colors.brand.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBodyText}>{item.body}</Text>
                  <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
                </View>
                {item.data?.bookingId ? (
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                ) : null}
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

function iconForType(type: string, read: boolean): keyof typeof Ionicons.glyphMap {
  const t = type.toUpperCase()
  if (t === 'MESSAGE') return read ? 'chatbubble-outline' : 'chatbubble'
  if (t.startsWith('QUOTE')) return read ? 'pricetag-outline' : 'pricetags'
  if (t === 'BOOKING_STATUS') return read ? 'car-outline' : 'car'
  return read ? 'notifications-outline' : 'notifications'
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: 10,
  },
  toolbarMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  markAll: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.brand.primary },
  listContent: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: 32 },
  emptyList: { flexGrow: 1 },
  card: {
    borderRadius: layout.cardRadius,
    marginBottom: layout.listCardGap,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.primary[50],
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: layout.cardRadiusSmall,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, marginBottom: 4 },
  cardBodyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  cardTime: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral[500], marginTop: 8 },
  empty: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
})
