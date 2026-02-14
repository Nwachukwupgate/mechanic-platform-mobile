import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../theme/colors';

export type MechanicMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
};

type MechanicsMapProps = {
  userLat: number;
  userLng: number;
  mechanics: MechanicMarker[];
  style?: object;
};

const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

export function MechanicsMap({ userLat, userLng, mechanics, style }: MechanicsMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!mapRef.current || (mechanics.length === 0)) return;
    const coords = [
      { latitude: userLat, longitude: userLng },
      ...mechanics.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
    ];
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [userLat, userLng, mechanics]);

  const region = {
    latitude: userLat,
    longitude: userLng,
    ...DEFAULT_DELTA,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={{ latitude: userLat, longitude: userLng }}
          title="Your location"
          pinColor={colors.primary[600]}
        />
        {mechanics.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            pinColor={colors.accent.green}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.neutral[200],
  },
});
