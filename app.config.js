/**
 * Expo Go always runs the New Architecture; keep `newArchEnabled` in app.json aligned (true)
 * or Metro warns. If a device build still crashes on Modal + Paystack, try false again for
 * production-only testing via a separate profile in eas.json.
 */
const base = require('./app.json').expo;
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const DEFAULT_API_BASE = 'https://mechanic.denicksenglobal.com';
function normalizeApiBaseUrl(u) {
  const s = String(u || '')
    .trim()
    .replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(s)) return DEFAULT_API_BASE;
  return s;
}
const apiBaseUrl = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE
);

// react-native-maps does not ship an Expo config plugin; we only set the Android API key here.
module.exports = {
  expo: {
    ...base,
    plugins: [
      ...(base.plugins || []),
      '@react-native-community/datetimepicker',
      [
        'expo-notifications',
        {
          color: '#16a34a',
          sounds: ['./assets/sounds/garage_ping.mp3'],
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Denicksen Auto to use your location to find nearby mechanics and set your workshop on the map.',
        },
      ],
    ],
    slug: 'mechanic',
    owner: 'treyp99s-organization',
    extra: {
      ...base.extra,
      /** Used at runtime (Expo Go + native builds) — see src/config/apiBaseUrl.ts */
      apiBaseUrl,
      eas: {
        projectId: 'b2e1f900-e081-4397-95a7-0ac11f0c99eb',
        owner: 'treyp99s-organization',
      },
    },
    ios: {
      ...base.ios,
      bundleIdentifier: 'com.anonymous.mechanicplatformmobile',
      infoPlist: {
        ...base.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
        /**
         * Must be YES for per-screen status bar (RN warns if false).
         * Also duplicated in app.json so merges never drop it.
         */
        UIViewControllerBasedStatusBarAppearance: true,
      },
    },
    android: {
      ...base.android,
      /** New Play Store listing (replaces suspended `com.anonymous.mechanicplatformmobiles`). Must match Play Console → App → App ID exactly. */
      package: 'com.denicksenauto.mechanic',
      config: {
        ...(base.android?.config || {}),
        googleMaps: {
          apiKey,
        },
      },
    },
  },
};
