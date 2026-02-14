# mechanic-platform-mobile

Expo (React Native) app for the mechanic platform.

## Environment variables

Create a `.env` file in the project root with:

- **`EXPO_PUBLIC_API_URL`** – Backend API base URL (e.g. `http://localhost:4000`).
- **`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`** – Google Maps API key used for:
  - Map tiles and markers on Android/iOS (via `react-native-maps`).
  - Reverse geocoding (address lookup from coordinates) in the Find Mechanics flow.

Enable the Geocoding API and Maps SDK for Android/iOS in [Google Cloud Console](https://console.cloud.google.com/) for this key.
