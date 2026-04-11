const base = require('./app.json').expo;
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// react-native-maps does not ship an Expo config plugin; we only set the Android API key here.
module.exports = {
  expo: {
    ...base,
    plugins: [
      ...(base.plugins || []),
      '@react-native-community/datetimepicker',
      'expo-notifications',
    ],
    slug: 'mechanic',
    owner: 'treyp99s-organization',
    extra: {
      ...base.extra,
      eas: {
        projectId: 'b2e1f900-e081-4397-95a7-0ac11f0c99eb',
        owner: 'treyp99s-organization',
      },
    },
    ios: {
      ...base.ios,
      bundleIdentifier: 'com.anonymous.mechanicplatformmobile',
      buildNumber: '3',
      infoPlist: {
        ...base.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...base.android,
      package: 'com.anonymous.mechanicplatformmobiles',
      config: {
        ...(base.android?.config || {}),
        googleMaps: {
          apiKey,
        },
      },
    },
  },
};
