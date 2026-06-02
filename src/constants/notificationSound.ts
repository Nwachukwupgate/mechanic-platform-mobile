/**
 * Registered with expo-notifications plugin (truck_horn.wav).
 * Runtime references use the base filename WITHOUT extension (Expo requirement).
 */
export const NOTIFICATION_ALERT_SOUND = 'truck_horn'

/** @deprecated Use NOTIFICATION_ALERT_SOUND — kept for any stale imports */
export const GARAGE_PING_SOUND = NOTIFICATION_ALERT_SOUND

/** New channel IDs — Android channels are immutable; bump when sound/importance changes. */
export const ANDROID_ALERTS_CHANNEL = 'alerts-v3'
export const ANDROID_MESSAGES_CHANNEL = 'messages-v3'
export const ANDROID_BOOKINGS_CHANNEL = 'bookings-v3'
export const ANDROID_DEFAULT_CHANNEL = 'default-v3'
