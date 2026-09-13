import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';

let ViewAnnotation: any = null;
if (Platform.OS !== 'web') {
  try {
    const ML = require('@maplibre/maplibre-react-native');
    ViewAnnotation = ML.ViewAnnotation;
  } catch (e) {}
}

interface RunnerMarkerProps {
  coordinate: [number, number]; // [longitude, latitude]
  color: string;
  glowColor: string;
}

export const RunnerMarker: React.FC<RunnerMarkerProps> = React.memo(({
  coordinate,
  color,
  glowColor,
}) => {
  if (!ViewAnnotation || Platform.OS === 'web') return null;

  return (
    <ViewAnnotation id="jogpalLiveRunnerMarker" lngLat={coordinate}>
      <View style={[styles.outerRing, { borderColor: color }]}>
        <View style={styles.middleSpacer}>
          <View style={[styles.innerCore, { backgroundColor: color }]} />
        </View>
      </View>
    </ViewAnnotation>
  );
});

const styles = StyleSheet.create({
  outerRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(217, 119, 87, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7347',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  middleSpacer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16161B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
