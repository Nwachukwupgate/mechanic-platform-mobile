# mechanic-platform-mobile

Expo (React Native) app for the mechanic platform.

## Building an APK for your client

**New to this?** Follow the full step-by-step guide (includes Android Studio setup and how to share the APK):

- **[docs/BUILD_AND_SHARE_APK.md](docs/BUILD_AND_SHARE_APK.md)** – Install Android Studio, build the APK, and share it with your client.

Quick build (after Android Studio is set up):

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease && cd ..
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Environment variables

Create a `.env` file in the project root with:

- **`EXPO_PUBLIC_API_URL`** – Backend API base URL (e.g. `http://localhost:4000`).
- **`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`** – Google Maps API key used for:
  - Map tiles and markers on Android/iOS (via `react-native-maps`).
  - Reverse geocoding (address lookup from coordinates) in the Find Mechanics flow.

Enable the Geocoding API and Maps SDK for Android/iOS in [Google Cloud Console](https://console.cloud.google.com/) for this key.
