import Constants from 'expo-constants'

const DEFAULT = 'https://mechanic.denicksenglobal.com'

/** Trim, strip trailing slashes, require http(s) — avoids bad base URLs that show up as generic "Network Error" in Axios. */
export function normalizeApiBaseUrl(raw: string | undefined | null): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(s)) return DEFAULT
  return s
}

/**
 * Base URL for REST calls. Prefer `expo.extra` (set in app.config.js) so Expo Go and
 * EAS builds resolve the same host; Metro-inlined `process.env` can be stale or empty
 * until you restart with a cleared cache.
 */
export function getApiBaseUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl
  if (fromExtra) return normalizeApiBaseUrl(fromExtra)

  return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL)
}

export const API_BASE_URL = getApiBaseUrl()
