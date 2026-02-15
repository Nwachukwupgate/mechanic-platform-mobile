const base = require('./app.json').expo;
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// react-native-maps does not ship an Expo config plugin; we only set the Android API key here.
module.exports = {
  expo: {
    ...base,
    android: {
      ...base.android,
      package: 'com.anonymous.mechanicplatformmobile',
      config: {
        ...(base.android?.config || {}),
        googleMaps: {
          apiKey,
        },
      },
    },
  },
};
