import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let RNMarker: any = null;
if (Platform.OS !== 'web') {
  try {
    const RNMaps = require('react-native-maps');
    RNMarker = RNMaps.Marker;
  } catch (e) {}
}

export interface FinishMarkerProps {
  coordinate: { latitude: number; longitude: number } | [number, number];
}

export const FinishBadge: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.beaconRing}>
      <View style={styles.iconCore}>
        <Ionicons name="flag" size={10} color="#FFF" />
      </View>
    </View>
    <View style={styles.labelContainer}>
      <Text style={styles.labelText}>FINISH</Text>
    </View>
  </View>
);

export const FinishMarker: React.FC<FinishMarkerProps> = React.memo(({ coordinate }) => {
  const coord = Array.isArray(coordinate)
    ? { latitude: coordinate[1], longitude: coordinate[0] }
    : coordinate;

  if (Platform.OS === 'web' || !RNMarker) return null;

  return (
    <RNMarker coordinate={coord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <FinishBadge />
    </RNMarker>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  iconCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    backgroundColor: '#0A0A0E',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginTop: 2,
  },
  labelText: {
    color: '#FF3B30',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
