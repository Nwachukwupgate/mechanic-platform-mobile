import { useCallback, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type LocationPermissionContext = 'user' | 'mechanic';

/** Alert when foreground location permission was denied; offers Open Settings. */
export function promptOpenLocationSettings(context: LocationPermissionContext): void {
  const message =
    context === 'mechanic'
      ? 'Location is off or denied. Turn it on in Settings so we can set your workshop on the map and show you in nearby search.'
      : 'Location is off or denied. Turn it on in Settings so we can find mechanics near you.';

  Alert.alert('Turn on location', message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        Linking.openSettings().catch(() => {
          Alert.alert(
            'Settings',
            Platform.OS === 'ios'
              ? 'Open Settings → Denicksen Auto → Location → While Using the App.'
              : 'Open Settings → Apps → Denicksen Auto → Permissions → Location.'
          );
        });
      },
    },
  ]);
}

export type LocationState = {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
};

const initialState: LocationState = {
  lat: null,
  lng: null,
  loading: false,
  error: null,
  permissionDenied: false,
};

/**
 * Request location permission and fetch current GPS coordinates.
 * Returns updated state: coords, loading, error, permissionDenied.
 */
export async function getCurrentPosition(): Promise<LocationState> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        ...initialState,
        error: 'Location permission was denied.',
        permissionDenied: true,
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      loading: false,
      error: null,
      permissionDenied: false,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get location';
    const isPermissionDenied =
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('denied');
    return {
      ...initialState,
      error: message,
      permissionDenied: isPermissionDenied,
    };
  }
}


/**
 * Hook: current location state, loading, error, and a function to request location.
 * Call getLocation() (e.g. from "Use my location") to request permission and fetch coords.
 */
export function useCurrentLocation(): {
  locationState: LocationState
  locationLoading: boolean
  getLocation: () => Promise<LocationState>
  setManualLocation: (lat: number, lng: number) => void
  clearError: () => void
} {
  const [locationState, setLocationState] = useState<LocationState>(initialState);
  const [locationLoading, setLocationLoading] = useState(false);

  const getLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationState((prev) => ({ ...prev, error: null, permissionDenied: false }));
    const next = await getCurrentPosition();
    setLocationState(next);
    setLocationLoading(false);
    return next;
  }, []);

  const clearError = useCallback(() => {
    setLocationState((prev) => ({ ...prev, error: null, permissionDenied: false }))
  }, [])

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setLocationState({
      lat,
      lng,
      loading: false,
      error: null,
      permissionDenied: false,
    })
  }, [])

  return {
    locationState,
    locationLoading,
    getLocation,
    setManualLocation,
    clearError,
  }
}
