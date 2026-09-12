import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { GPSPoint, LatLng } from '../types/soloRun';
import { jogpalDarkMapStyle } from '../theme/mapStyle';
import { colors } from '../theme/colors';

interface JogpalMapViewProps {
  currentLocation?: GPSPoint | null;
  actualRoute: LatLng[];
  plannedRoute?: LatLng[];
  style?: any;
  interactive?: boolean;
}

export const JogpalMapView: React.FC<JogpalMapViewProps> = ({
  currentLocation,
  actualRoute,
  plannedRoute = [],
  style,
  interactive = true,
}) => {
  // If Web environment, render web-safe stylized dark map container
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webContainer, style]}>
        <View style={styles.webGridOverlay} />
        <View style={styles.webMarkerContainer}>
          <View style={styles.runnerMarkerOuter}>
            <View style={styles.runnerMarkerInner} />
          </View>
        </View>
        <Text style={styles.webText}>JOGPAL DARK MAP (NATIVE GPS ACTIVE)</Text>
      </View>
    );
  }

  // Native Android/iOS environment: dynamically require react-native-maps
  const MapView = require('react-native-maps').default;
  const { Polyline, Marker, PROVIDER_DEFAULT } = require('react-native-maps');

  const mapRef = useRef<any>(null);

  const initialRegion = {
    latitude: currentLocation?.latitude || 37.78825,
    longitude: currentLocation?.longitude || -122.4324,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        },
        800
      );
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    if (!currentLocation && actualRoute.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(actualRoute, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [actualRoute.length, currentLocation]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        customMapStyle={jogpalDarkMapStyle}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsBuildings={false}
        showsScale={false}
        showsTraffic={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={false}
      >
        {/* Planned Route Polyline */}
        {plannedRoute.length > 1 && (
          <Polyline
            coordinates={plannedRoute}
            strokeColor="#333333"
            strokeWidth={4}
            lineDashPattern={[8, 6]}
          />
        )}

        {/* Actual Live GPS Route Polyline */}
        {actualRoute.length > 1 && (
          <Polyline
            coordinates={actualRoute}
            strokeColor={colors.limePrimary}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Custom JOGPAL Neon Runner Marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <View style={styles.runnerMarkerOuter}>
              <View style={styles.runnerMarkerInner} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1C1C1C',
    backgroundColor: '#050505',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  webContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090D',
    position: 'relative',
  },
  webGridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#050505',
    opacity: 0.8,
  },
  webMarkerContainer: {
    marginBottom: 10,
    zIndex: 2,
  },
  webText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 1.2,
    zIndex: 2,
  },
  runnerMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 255, 0, 0.3)',
    borderWidth: 2,
    borderColor: colors.limePrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runnerMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.limePrimary,
  },
});
