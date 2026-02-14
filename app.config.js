const base = require('./app.json').expo;
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    ...base,
    plugins: [
      ...(base.plugins || []),
      [
        'react-native-maps',
        {
          googleMapsApiKey: apiKey,
        },
      ],
    ],
    android: {
      ...base.android,
      config: {
        ...(base.android?.config || {}),
        googleMaps: {
          apiKey,
        },
      },
    },
  },
};
