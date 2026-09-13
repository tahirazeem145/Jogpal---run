import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { JogpalMapProps, JogpalCoordinate, CameraMode } from '../../types/map';
import { MAP_CONFIG } from '../../config/map';
import { useTheme } from '../../context/ThemeContext';
import { RunRoute } from './RunRoute';
import { RunnerMarker } from './RunnerMarker';
import { StartMarker } from './StartMarker';
import { FinishMarker } from './FinishMarker';
import { PartnerMarker } from './PartnerMarker';

// Safely require MapLibre Native on Android / iOS
let MapComponent: any = null;
let CameraComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    const ML = require('@maplibre/maplibre-react-native');
    MapComponent = ML.Map;
    CameraComponent = ML.Camera;
  } catch (err) {
    console.warn('[MAPLIBRE_INIT_WARN] Native Map module could not be loaded:', err);
  }
}

export const JogpalMap: React.FC<JogpalMapProps> = ({
  currentLocation,
  actualRoute,
  plannedRoute = [],
  partnerRunners = [],
  style,
  interactive = true,
  showRecenterButton = true,
  showStartFinishMarkers = false,
  fitRouteOnLoad = false,
  onMapLoaded,
  onMapError,
}) => {
  const { colors } = useTheme();
  const [cameraMode, setCameraMode] = useState<CameraMode>('FOLLOWING');
  const [isMapReady, setIsMapReady] = useState(false);

  const cameraRef = useRef<any>(null);
  const lastCameraUpdateRef = useRef<number>(0);
  const initialCenterSetRef = useRef<boolean>(false);

  // 1. Web Environment: Interactive Leaflet Dark Map Container
  if (Platform.OS === 'web') {
    const lat = currentLocation?.latitude || MAP_CONFIG.defaultCenterCoordinate[1];
    const lng = currentLocation?.longitude || MAP_CONFIG.defaultCenterCoordinate[0];
    const actualCoords = actualRoute.map((p) => [p.latitude, p.longitude]);
    const plannedCoords = plannedRoute.map((p) => [p.latitude, p.longitude]);

    const leafletHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #0E0F14; }
            .leaflet-container { background: #0E0F14 !important; }
            .dark-tiles {
              filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%);
            }
            .runner-marker {
              width: 24px; height: 24px; border-radius: 12px;
              background: ${colors.glow}; border: 2px solid ${colors.primary};
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 0 10px ${colors.glow};
            }
            .runner-inner { width: 10px; height: 10px; border-radius: 5px; background: ${colors.primary}; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 16);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              className: 'dark-tiles'
            }).addTo(map);

            var customIcon = L.divIcon({
              className: '',
              html: '<div class="runner-marker"><div class="runner-inner"></div></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            L.marker([${lat}, ${lng}], { icon: customIcon }).addTo(map);

            ${plannedCoords.length > 1 ? `L.polyline(${JSON.stringify(plannedCoords)}, { color: '#555566', weight: 4, dashArray: '8, 6' }).addTo(map);` : ''}
            ${actualCoords.length > 1 ? `L.polyline(${JSON.stringify(actualCoords)}, { color: '${colors.primary}', weight: 5, opacity: 0.95 }).addTo(map);` : ''}
          </script>
        </body>
      </html>
    `;

    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={leafletHTML}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 20 }}
          title="JOGPAL Web Map"
        />
      </View>
    );
  }

  // 2. Center Camera Once on Initial Position Acquisition
  useEffect(() => {
    if (currentLocation && !initialCenterSetRef.current) {
      initialCenterSetRef.current = true;
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  // 3. Smart Throttled Camera Follow (~800ms)
  const cameraCenterCoordinate: JogpalCoordinate | undefined = useMemo(() => {
    if (!currentLocation || cameraMode === 'USER_CONTROLLED' || fitRouteOnLoad) {
      return undefined;
    }

    const now = Date.now();
    if (now - lastCameraUpdateRef.current < MAP_CONFIG.cameraFollowThrottleMs && initialCenterSetRef.current) {
      return undefined;
    }

    lastCameraUpdateRef.current = now;
    return [currentLocation.longitude, currentLocation.latitude];
  }, [currentLocation?.latitude, currentLocation?.longitude, cameraMode, fitRouteOnLoad]);

  // 4. Handle User Gestures (Panning cancels follow mode)
  const [zoomLevel, setZoomLevel] = useState<number>(MAP_CONFIG.defaultZoom);

  // 4. Handle User Gestures (Panning cancels follow mode)
  const handleCameraChanged = useCallback((e: any) => {
    if (e?.userInteraction && cameraMode !== 'USER_CONTROLLED') {
      setCameraMode('USER_CONTROLLED');
    }
  }, [cameraMode]);

  // 5. Compass / Recenter Button Handler
  const handleCompassPress = useCallback(() => {
    setCameraMode('FOLLOWING');
    if (cameraRef.current) {
      const targetCenter = currentLocation
        ? [currentLocation.longitude, currentLocation.latitude]
        : MAP_CONFIG.defaultCenterCoordinate;
      cameraRef.current.easeTo({
        center: targetCenter,
        zoom: MAP_CONFIG.defaultZoom,
        bearing: 0,
        duration: 600,
      });
    }
  }, [currentLocation]);

  // 6. Zoom In & Out Controls
  const handleZoomIn = useCallback(() => {
    const nextZoom = Math.min(zoomLevel + 1, MAP_CONFIG.maxZoom);
    setZoomLevel(nextZoom);
    if (cameraRef.current) {
      cameraRef.current.easeTo({
        zoom: nextZoom,
        duration: 350,
      });
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const nextZoom = Math.max(zoomLevel - 1, MAP_CONFIG.minZoom);
    setZoomLevel(nextZoom);
    if (cameraRef.current) {
      cameraRef.current.easeTo({
        zoom: nextZoom,
        duration: 350,
      });
    }
  }, [zoomLevel]);

  // 7. Calculate Bounding Box for Completed Route (Run History)
  const routeBounds = useMemo(() => {
    if (!fitRouteOnLoad || actualRoute.length < 2) return undefined;

    let minLat = actualRoute[0].latitude;
    let maxLat = actualRoute[0].latitude;
    let minLng = actualRoute[0].longitude;
    let maxLng = actualRoute[0].longitude;

    actualRoute.forEach((pt) => {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLng) minLng = pt.longitude;
      if (pt.longitude > maxLng) maxLng = pt.longitude;
    });

    return {
      ne: [maxLng, maxLat] as [number, number],
      sw: [minLng, minLat] as [number, number],
      paddingTop: 50,
      paddingRight: 50,
      paddingBottom: 50,
      paddingLeft: 50,
    };
  }, [actualRoute, fitRouteOnLoad]);

  const startCoord: JogpalCoordinate | null = useMemo(() => {
    if (actualRoute.length > 0) {
      return [actualRoute[0].longitude, actualRoute[0].latitude];
    }
    return null;
  }, [actualRoute]);

  const finishCoord: JogpalCoordinate | null = useMemo(() => {
    if (actualRoute.length > 1) {
      const last = actualRoute[actualRoute.length - 1];
      return [last.longitude, last.latitude];
    }
    return null;
  }, [actualRoute]);

  if (!MapComponent || !CameraComponent) {
    return (
      <View
        style={[
          styles.container,
          { borderColor: colors.primary, shadowColor: colors.primary },
          styles.fallbackContainer,
          style,
        ]}
      >
        <MaterialCommunityIcons name="map-marker-radius" size={32} color={colors.primary} />
        <Text style={[styles.fallbackTitle, { color: colors.textPrimary }]}>MAP ENGINE LOADING</Text>
        <Text style={[styles.fallbackSubtext, { color: colors.textSecondary }]}>
          High-accuracy GPS telemetry active
        </Text>
      </View>
    );
  }

  const initialCenter: [number, number] = currentLocation
    ? [currentLocation.longitude, currentLocation.latitude]
    : MAP_CONFIG.defaultCenterCoordinate;

  return (
    <View style={[styles.container, { borderColor: colors.primary, shadowColor: colors.primary }, style]}>
      <MapComponent
        style={styles.map}
        mapStyle={MAP_CONFIG.styleURL}
        logo={false}
        attribution={false}
        scrollGestures={interactive}
        zoomGestures={interactive}
        rotateGestures={interactive}
        pitchGestures={false}
        onCameraChanged={handleCameraChanged}
        onMapLoaded={() => {
          setIsMapReady(true);
          if (onMapLoaded) onMapLoaded();
        }}
        onMapError={(e: any) => {
          if (onMapError) onMapError(e);
        }}
      >
        <CameraComponent
          ref={cameraRef}
          initialViewState={{
            center: initialCenter,
            zoom: MAP_CONFIG.defaultZoom,
          }}
          center={cameraCenterCoordinate || (currentLocation ? [currentLocation.longitude, currentLocation.latitude] : initialCenter)}
          zoom={zoomLevel}
          minZoom={MAP_CONFIG.minZoom}
          maxZoom={MAP_CONFIG.maxZoom}
          bounds={
            routeBounds
              ? {
                  bounds: [
                    routeBounds.sw[0],
                    routeBounds.sw[1],
                    routeBounds.ne[0],
                    routeBounds.ne[1],
                  ],
                  padding: {
                    top: routeBounds.paddingTop,
                    right: routeBounds.paddingRight,
                    bottom: routeBounds.paddingBottom,
                    left: routeBounds.paddingLeft,
                  },
                }
              : undefined
          }
        />

        {/* Polylines for Live and Planned Routes */}
        <RunRoute
          actualRoute={actualRoute}
          plannedRoute={plannedRoute}
          routeColor={colors.primary}
        />

        {/* Start and Finish Pins for Route Overview */}
        {showStartFinishMarkers && startCoord && <StartMarker coordinate={startCoord} />}
        {showStartFinishMarkers && finishCoord && actualRoute.length > 1 && (
          <FinishMarker coordinate={finishCoord} />
        )}

        {/* Live Runner Marker */}
        {currentLocation && (
          <RunnerMarker
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            color={colors.primary}
            glowColor={colors.glow}
          />
        )}

        {/* Active Partner / Crew Runner Markers */}
        {partnerRunners.map((partner) => (
          <PartnerMarker key={partner.id} runner={partner} accentColor={colors.primary} />
        ))}
      </MapComponent>

      {/* Floating Compass Button (Top Right) */}
      {interactive && (
        <TouchableOpacity
          style={[styles.compassBtn, { backgroundColor: 'rgba(20, 20, 24, 0.88)', borderColor: '#33333E' }]}
          onPress={handleCompassPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="navigation" size={20} color={colors.primary} style={styles.compassIcon} />
        </TouchableOpacity>
      )}

      {/* Floating Zoom Controls (Bottom Right) */}
      {interactive && (
        <View style={styles.zoomControlGroup}>
          <TouchableOpacity
            style={[styles.zoomBtn, { backgroundColor: 'rgba(20, 20, 24, 0.88)', borderColor: '#33333E' }]}
            onPress={handleZoomIn}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomBtn, { backgroundColor: 'rgba(20, 20, 24, 0.88)', borderColor: '#33333E' }]}
            onPress={handleZoomOut}
            activeOpacity={0.8}
          >
            <Feather name="minus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: '#0E0F14',
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0E0F14',
  },
  fallbackTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 8,
  },
  fallbackSubtext: {
    fontSize: 10,
    marginTop: 4,
  },
  compassBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  compassIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  zoomControlGroup: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    gap: 8,
    zIndex: 10,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
