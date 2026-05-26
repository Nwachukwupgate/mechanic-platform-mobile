import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useAuthStore } from '../store/authStore'
import {
  connectSocket,
  onQuoteEvents,
  onNewMessage,
  onBookingStatusChanged,
  onInspectionPaid,
} from '../services/socket'
import { presentMajorAlert, presentMessageAlert } from '../services/alertNotifications'

const MAJOR_BOOKING_STATUSES = new Set(['PAID', 'IN_PROGRESS', 'DONE', 'DELIVERED'])

/**
 * Plays sound + shows a banner when major real-time events arrive while the app is open.
 * Background / locked phone alerts still come from server push (also with sound).
 */
export function useRealtimeAlerts(isAuthenticated: boolean) {
  const user = useAuthStore((s) => s.user)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    connectSocket()

    const isForeground = () => appStateRef.current === 'active'
    const role = user.role

    const unsubQuote = onQuoteEvents((data) => {
      if (!isForeground()) return
      const bookingId = data.bookingId
      const base = { bookingId, type: data.event.replace(':', '_') }

      if (data.event === 'quote:created' && role === 'USER') {
        void presentMajorAlert({
          title: 'New quote',
          body: 'A mechanic sent a quote on your job.',
          data: { ...base, type: 'quote_created' },
        })
        return
      }

      if (data.event === 'quote:accepted') {
        if (role === 'MECHANIC') {
          void presentMajorAlert({
            title: 'Quote accepted',
            body: 'The customer accepted your quote. Chat is now open.',
            data: { ...base, type: 'quote_accepted' },
          })
        } else if (role === 'USER') {
          void presentMajorAlert({
            title: 'Booking confirmed',
            body: 'Your quote was accepted. You can chat with your mechanic.',
            data: { ...base, type: 'quote_accepted' },
          })
        }
        return
      }

      if (data.event === 'quote:rejected' && role === 'MECHANIC') {
        void presentMajorAlert({
          title: 'Quote declined',
          body: 'The customer declined your quote. You can update and resubmit.',
          data: { ...base, type: 'quote_rejected' },
        })
      }
    })

    const unsubInspection = onInspectionPaid((data) => {
      if (!isForeground() || role !== 'MECHANIC') return
      const amount =
        data.amountNaira != null
          ? `₦${Number(data.amountNaira).toLocaleString()}`
          : 'the inspection fee'
      void presentMajorAlert({
        title: 'Inspection fee paid',
        body: `The customer paid ${amount}. You can start the visit.`,
        data: { bookingId: data.bookingId, type: 'inspection_paid' },
      })
    })

    const unsubStatus = onBookingStatusChanged((data) => {
      if (!isForeground()) return
      if (!MAJOR_BOOKING_STATUSES.has(data.status)) return

      const bookingId = data.bookingId
      if (data.status === 'PAID') {
        if (role === 'MECHANIC') {
          void presentMajorAlert({
            title: 'Payment received',
            body: 'The customer completed payment for this job.',
            data: { bookingId, type: 'payment_received' },
          })
        } else {
          void presentMajorAlert({
            title: 'Payment confirmed',
            body: 'Your payment was recorded for this job.',
            data: { bookingId, type: 'payment_confirmed' },
          })
        }
        return
      }

      if (data.status === 'IN_PROGRESS' && role === 'USER') {
        void presentMajorAlert({
          title: 'Work started',
          body: 'Your mechanic has started work on your vehicle.',
          data: { bookingId, type: 'work_started' },
        })
        return
      }

      if (data.status === 'DONE' && role === 'USER') {
        void presentMajorAlert({
          title: 'Job marked done',
          body: 'Your mechanic marked the job as complete.',
          data: { bookingId, type: 'job_done' },
        })
      }
    })

    const unsubMsg = onNewMessage((data) => {
      if (!isForeground()) return
      const preview =
        typeof data.message?.content === 'string'
          ? data.message.content.slice(0, 80)
          : 'New message'
      void presentMessageAlert({
        title: 'New message',
        body: preview,
        data: { bookingId: data.bookingId, type: 'message' },
      })
    })

    return () => {
      unsubQuote()
      unsubInspection()
      unsubStatus()
      unsubMsg()
    }
  }, [isAuthenticated, user?.id, user?.role])
}
