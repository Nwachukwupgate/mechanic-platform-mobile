import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../store/authStore'
import { connectSocket, joinBooking, leaveBooking, sendMessage } from '../services/socket'
import { colors } from '../theme/colors'

type Message = { id: string; content: string; senderId: string; createdAt?: string }

type Props = {
  bookingId: string
  messages: Message[]
  onMessagesChange: (messages: Message[]) => void
}

export function BookingChat({ bookingId, messages, onMessagesChange }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id) || ''
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const socket = connectSocket()
    if (socket && !socket.connected) socket.connect()
    joinBooking(bookingId)
    return () => { leaveBooking(bookingId) }
  }, [bookingId])

  const handleSend = async () => {
    const text = (draft || '').trim()
    if (!text || sending) return
    setSending(true)
    try {
      sendMessage(bookingId, text)
      setDraft('')
      const tempMsg: Message = {
        id: `temp-${Date.now()}`,
        content: text,
        senderId: currentUserId,
        createdAt: new Date().toISOString(),
      }
      onMessagesChange([...messages, tempMsg])
    } catch (_) {}
    finally { setSending(false) }
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <Text style={styles.noMessages}>No messages yet. Say hello!</Text>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.senderId === currentUserId ? styles.bubbleRight : styles.bubbleLeft,
              ]}
            >
              <Text style={styles.bubbleText}>{msg.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.neutral[400]}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            <Ionicons
              name="send"
              size={22}
              color={draft.trim() && !sending ? colors.primary[600] : colors.neutral[400]}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  messageList: { flex: 1, maxHeight: 320 },
  messageListContent: { paddingVertical: 8, paddingBottom: 16 },
  noMessages: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: colors.neutral[100] },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: colors.primary[100] },
  bubbleText: { fontSize: 15, color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral[200],
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 44,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: { position: 'absolute', right: 12, bottom: 16 },
  sendBtnDisabled: { opacity: 0.6 },
})
