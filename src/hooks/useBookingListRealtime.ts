import { useEffect, useRef } from 'react'
import {
  connectSocket,
  onQuoteEvents,
  onNewMessage,
  onBookingStatusChanged,
  onInspectionPaid,
  onJobAssigned,
  onJobOpened,
} from '../services/socket'

/**
 * Keeps booking/job lists fresh in real time.
 *
 * Subscribes to the same socket events the detail screens use and calls `reload`
 * when anything relevant changes — so users and mechanics don't have to pull to
 * refresh to see new quotes, status changes, messages, or jobs.
 *
 * Reloads are coalesced (trailing) so a burst of events triggers a single fetch.
 */
export function useBookingListRealtime(reload: () => void, enabled = true) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    if (!enabled) return

    connectSocket()

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        reloadRef.current()
      }, 400)
    }

    const unsubQuote = onQuoteEvents(scheduleReload)
    const unsubMsg = onNewMessage(scheduleReload)
    const unsubStatus = onBookingStatusChanged(scheduleReload)
    const unsubInspection = onInspectionPaid(scheduleReload)
    const unsubJobAssigned = onJobAssigned(scheduleReload)
    const unsubJobOpened = onJobOpened(scheduleReload)

    return () => {
      if (timer) clearTimeout(timer)
      unsubQuote()
      unsubMsg()
      unsubStatus()
      unsubInspection()
      unsubJobAssigned()
      unsubJobOpened()
    }
  }, [enabled])
}
