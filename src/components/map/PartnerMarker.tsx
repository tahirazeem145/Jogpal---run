import React from 'react';
import { StyleSheet, View, Text, Image, Platform } from 'react-native';
import { PartnerRunner } from '../../types/map';

let ViewAnnotation: any = null;
if (Platform.OS !== 'web') {
  try {
    const ML = require('@maplibre/maplibre-react-native');
    const MapLibre = ML.default || ML;
    ViewAnnotation = MapLibre.PointAnnotation || MapLibre.MarkerView || MapLibre.ViewAnnotation;
  } catch (e) {}
}

interface PartnerMarkerProps {
  runner: PartnerRunner;
  accentColor: string;
}

export const PartnerMarker: React.FC<PartnerMarkerProps> = React.memo(({
  runner,
  accentColor,
}) => {
  if (!ViewAnnotation || Platform.OS === 'web') return null;

  return (
    <ViewAnnotation
      id={`partnerMarker_${runner.id}`}
      coordinate={[runner.longitude, runner.latitude]}
      lngLat={[runner.longitude, runner.latitude]}
    >
      <View style={styles.container}>
        <View style={[styles.avatarRing, { borderColor: accentColor }]}>
          {runner.avatarUrl ? (
            <Image source={{ uri: runner.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: accentColor }]}>
              <Text style={styles.avatarInitial}>{runner.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.tagContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {runner.name}
          </Text>
          {runner.distanceMeters !== undefined && (
            <Text style={[styles.distanceText, { color: accentColor }]}>
              {runner.distanceMeters < 1000
                ? `${Math.round(runner.distanceMeters)}m`
                : `${(runner.distanceMeters / 1000).toFixed(1)}km`}
            </Text>
          )}
        </View>
      </View>
    </ViewAnnotation>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  tagContainer: {
    backgroundColor: 'rgba(10,10,12,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  nameText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
