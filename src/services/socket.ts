import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket: Socket | null = null

function getSocketBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'
  try {
    const u = new URL(url)
    return `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`
  } catch {
    return 'http://localhost:4000'
  }
}

export function connectSocket(): Socket | null {
  if (socket?.connected) return socket
  const token = useAuthStore.getState().token
  if (!token) return null
  const baseUrl = getSocketBaseUrl()
  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket'],
  })
  return socket
}

export function getSocket(): Socket | null {
  return socket ?? null
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function joinBooking(bookingId: string): void {
  if (socket?.connected) socket.emit('join_booking', { bookingId })
}

export function leaveBooking(bookingId: string): void {
  if (socket?.connected) socket.emit('leave_booking', { bookingId })
}

export function sendMessage(bookingId: string, content: string): void {
  if (socket?.connected) socket.emit('send_message', { bookingId, content })
}

export function onNewMessage(cb: (data: { bookingId: string; message: any }) => void): () => void {
  if (!socket) return () => {}
  socket.on('new_message', cb)
  return () => { socket?.off('new_message', cb) }
}

export function onQuoteEvents(cb: (data: { bookingId: string; event: string; quote?: any }) => void): () => void {
  if (!socket) return () => {}
  const handler = (data: { bookingId: string; event?: string; quote?: any }) => {
    const event = data.event || 'quote:updated'
    cb({ bookingId: data.bookingId, event, quote: data.quote })
  }
  socket.on('quote:created', (data: any) => cb({ ...data, event: 'quote:created' }))
  socket.on('quote:updated', (data: any) => cb({ ...data, event: 'quote:updated' }))
  socket.on('quote:rejected', (data: any) => cb({ ...data, event: 'quote:rejected' }))
  socket.on('quote:accepted', (data: any) => cb({ ...data, event: 'quote:accepted' }))
  return () => {
    socket?.off('quote:created')
    socket?.off('quote:updated')
    socket?.off('quote:rejected')
    socket?.off('quote:accepted')
  }
}
