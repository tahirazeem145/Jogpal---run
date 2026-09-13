import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let ViewAnnotation: any = null;
if (Platform.OS !== 'web') {
  try {
    const ML = require('@maplibre/maplibre-react-native');
    const MapLibre = ML.default || ML;
    ViewAnnotation = MapLibre.PointAnnotation || MapLibre.MarkerView || MapLibre.ViewAnnotation;
  } catch (e) {}
}

interface FinishMarkerProps {
  coordinate: [number, number]; // [longitude, latitude]
}

export const FinishMarker: React.FC<FinishMarkerProps> = React.memo(({ coordinate }) => {
  if (!ViewAnnotation || Platform.OS === 'web') return null;

  return (
    <ViewAnnotation id="jogpalRouteFinishMarker" coordinate={coordinate} lngLat={coordinate}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Ionicons name="flag" size={11} color="#000" />
        </View>
        <Text style={styles.label}>FINISH</Text>
      </View>
    </ViewAnnotation>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF3B30',
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
