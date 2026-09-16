import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface StartMarkerProps {
  coordinate: { latitude: number; longitude: number } | [number, number];
}

export const StartBadge: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.beaconRing}>
      <View style={styles.iconCore}>
        <Ionicons name="play" size={10} color="#000" style={{ marginLeft: 1 }} />
      </View>
    </View>
    <View style={styles.labelContainer}>
      <Text style={styles.labelText}>START</Text>
    </View>
  </View>
);

export const StartMarker: React.FC<StartMarkerProps> = React.memo(() => {
  return <StartBadge />;
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
    backgroundColor: 'rgba(0, 255, 102, 0.25)',
    borderWidth: 1.5,
    borderColor: '#00FF66',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  iconCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00FF66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    backgroundColor: '#0A0A0E',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00FF66',
    marginTop: 2,
  },
  labelText: {
    color: '#00FF66',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
