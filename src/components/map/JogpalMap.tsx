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
import { jogpalDarkMapStyle } from '../../theme/mapStyle';
import { OfflineSyntheticMap } from './OfflineSyntheticMap';
import { locationService } from '../../services/locationService';
import { StartMarker } from './StartMarker';
import { FinishMarker } from './FinishMarker';
import { PartnerMarker } from './PartnerMarker';

const SQUAD_COLORS = ['#A8FF00', '#00E5FF', '#FF0055', '#FFB800', '#BD00FF'];

// Try require React Native Maps as standard Android / iOS native map provider
let RNMapView: any = null;
let RNPolyline: any = null;
let RNMarker: any = null;
let RNUrlTile: any = null;
if (Platform.OS !== 'web') {
  try {
    const RNMaps = require('react-native-maps');
    RNMapView = RNMaps.default || RNMaps.MapView || RNMaps;
    RNPolyline = RNMaps.Polyline;
    RNMarker = RNMaps.Marker;
    RNUrlTile = RNMaps.UrlTile;
  } catch (err) {}
}

export const JogpalMap: React.FC<JogpalMapProps> = ({
  currentLocation,
  actualRoute = [],
  plannedRoute = [],
  partnerRunners = [],
  style,
  interactive = true,
  isFullScreen = false,
  showRecenterButton = true,
  showStartFinishMarkers = false,
  fitRouteOnLoad = false,
  onMapLoaded,
  onMapError,
}) => {
  const { colors } = useTheme();
  const [cameraMode, setCameraMode] = useState<CameraMode>('FOLLOWING');
  const [isMapReady, setIsMapReady] = useState(false);

  const isFullScreenMode: boolean = Boolean(
    isFullScreen ||
      style === StyleSheet.absoluteFill ||
      (style && typeof style === 'object' && (style as any).position === 'absolute' && (style as any).top === 0)
  );

  const mapRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const isLeafletReadyRef = useRef<boolean>(false);
  const lastCameraUpdateRef = useRef<number>(0);
  const regionDeltaRef = useRef<{ latitudeDelta: number; longitudeDelta: number }>({
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  // Sanitize coordinates to prevent crashes from any NaN or corrupted coordinates
  const sanitizedActualRoute = useMemo(() => {
    if (!actualRoute || !Array.isArray(actualRoute)) return [];
    return actualRoute.filter(
      (pt) =>
        pt &&
        typeof pt.latitude === 'number' &&
        typeof pt.longitude === 'number' &&
        !isNaN(pt.latitude) &&
        !isNaN(pt.longitude) &&
        !(pt.latitude === 0 && pt.longitude === 0) &&
        pt.latitude >= -90 &&
        pt.latitude <= 90 &&
        pt.longitude >= -180 &&
        pt.longitude <= 180
    );
  }, [actualRoute]);

  const sanitizedPlannedRoute = useMemo(() => {
    if (!plannedRoute || !Array.isArray(plannedRoute)) return [];
    return plannedRoute.filter(
      (pt) =>
        pt &&
        typeof pt.latitude === 'number' &&
        typeof pt.longitude === 'number' &&
        !isNaN(pt.latitude) &&
        !isNaN(pt.longitude) &&
        !(pt.latitude === 0 && pt.longitude === 0) &&
        pt.latitude >= -90 &&
        pt.latitude <= 90 &&
        pt.longitude >= -180 &&
        pt.longitude <= 180
    );
  }, [plannedRoute]);

  // 1. Dynamic Region Calculation: Guarantees map never defaults to San Francisco
  // when an actual route, planned OSRM route, or currentLocation is available.
  const computedInitialRegion = useMemo(() => {
    const routeToFrame = sanitizedActualRoute.length > 0 ? sanitizedActualRoute : sanitizedPlannedRoute;
    if (routeToFrame.length > 0) {
      let minLat = routeToFrame[0].latitude;
      let maxLat = routeToFrame[0].latitude;
      let minLng = routeToFrame[0].longitude;
      let maxLng = routeToFrame[0].longitude;

      for (let i = 1; i < routeToFrame.length; i++) {
        const pt = routeToFrame[i];
        if (pt.latitude < minLat) minLat = pt.latitude;
        if (pt.latitude > maxLat) maxLat = pt.latitude;
        if (pt.longitude < minLng) minLng = pt.longitude;
        if (pt.longitude > maxLng) maxLng = pt.longitude;
      }

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const deltaLat = Math.max(0.005, (maxLat - minLat) * 1.4);
      const deltaLng = Math.max(0.005, (maxLng - minLng) * 1.4);

      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: deltaLat,
        longitudeDelta: deltaLng,
      };
    }

    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
    }

    const cached = locationService.getCachedLocation();
    if (cached) {
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
    }

    return {
      latitude: MAP_CONFIG.defaultCenterCoordinate[1],
      longitude: MAP_CONFIG.defaultCenterCoordinate[0],
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    };
  }, [sanitizedActualRoute, sanitizedPlannedRoute, currentLocation]);

  // 2. Throttled, Stable Native Camera Follow & Initial Frame
  const hasCenteredInitiallyRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !RNMapView || !mapRef.current || !isMapReady) return;

    // If planned OSRM route is supplied and actual route is not yet recording, fit to the planned circuit
    if (!hasCenteredInitiallyRef.current && sanitizedPlannedRoute.length > 1 && sanitizedActualRoute.length === 0) {
      hasCenteredInitiallyRef.current = true;
      try {
        mapRef.current.fitToCoordinates(sanitizedPlannedRoute, {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      } catch (e) {}
      return;
    }

    // Follow current location
    if (currentLocation && cameraMode === 'FOLLOWING' && !fitRouteOnLoad) {
      const now = Date.now();
      if (!hasCenteredInitiallyRef.current || now - lastCameraUpdateRef.current >= MAP_CONFIG.cameraFollowThrottleMs) {
        hasCenteredInitiallyRef.current = true;
        lastCameraUpdateRef.current = now;
        mapRef.current.animateToRegion(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: regionDeltaRef.current.latitudeDelta,
            longitudeDelta: regionDeltaRef.current.longitudeDelta,
          },
          700
        );
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, sanitizedPlannedRoute, cameraMode, fitRouteOnLoad, isMapReady]);

  // 3. Fit Route Coordinates for Native Map (Idempotent & Safe)
  const fitNativeRouteBounds = useCallback(() => {
    if (Platform.OS !== 'web' && RNMapView && mapRef.current && sanitizedActualRoute.length > 0) {
      if (sanitizedActualRoute.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: sanitizedActualRoute[0].latitude,
            longitude: sanitizedActualRoute[0].longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          400
        );
      } else {
        const executeFit = () => {
          if (mapRef.current) {
            try {
              mapRef.current.fitToCoordinates(sanitizedActualRoute, {
                edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                animated: true,
              });
            } catch (e) {}
          }
        };

        if (Platform.OS === 'android') {
          setTimeout(executeFit, 100);
        } else {
          executeFit();
        }
      }
    }
  }, [sanitizedActualRoute]);

  useEffect(() => {
    if (fitRouteOnLoad && isMapReady && sanitizedActualRoute.length > 0) {
      fitNativeRouteBounds();
    }
  }, [fitRouteOnLoad, isMapReady, sanitizedActualRoute.length, fitNativeRouteBounds]);

  // 4. Web Leaflet Communication & Handshake
  const postToLeaflet = useCallback((message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch (e) {}
    }
  }, []);

  // Listen for Leaflet events from inside iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWebMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'LEAFLET_READY') {
        isLeafletReadyRef.current = true;
        setIsMapReady(true);
        if (onMapLoaded) onMapLoaded();

        // Send initial state to Leaflet
        postToLeaflet({
          type: 'INIT_STATE',
          lat: currentLocation?.latitude || computedInitialRegion.latitude,
          lng: currentLocation?.longitude || computedInitialRegion.longitude,
          actualCoords: sanitizedActualRoute.map((p) => [p.latitude, p.longitude]),
          plannedCoords: sanitizedPlannedRoute.map((p) => [p.latitude, p.longitude]),
          partners: partnerRunners,
          fitRouteOnLoad,
        });
      } else if (event.data.type === 'USER_INTERACTION') {
        if (cameraMode !== 'USER_CONTROLLED') {
          setCameraMode('USER_CONTROLLED');
        }
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => {
      window.removeEventListener('message', handleWebMessage);
    };
  }, [cameraMode, currentLocation, computedInitialRegion, sanitizedActualRoute, sanitizedPlannedRoute, partnerRunners, fitRouteOnLoad, onMapLoaded, postToLeaflet]);

  // Send real-time updates to Web Leaflet container
  useEffect(() => {
    if (Platform.OS === 'web' && isLeafletReadyRef.current) {
      postToLeaflet({
        type: 'UPDATE_LOCATION',
        lat: currentLocation?.latitude,
        lng: currentLocation?.longitude,
        actualCoords: sanitizedActualRoute.map((p) => [p.latitude, p.longitude]),
        cameraMode,
        partners: partnerRunners,
      });
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, sanitizedActualRoute, cameraMode, partnerRunners, postToLeaflet]);

  // 5. Interactive Control Handlers
  const handleCompassPress = useCallback(() => {
    setCameraMode('FOLLOWING');
    if (Platform.OS !== 'web' && mapRef.current && currentLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: regionDeltaRef.current.latitudeDelta,
          longitudeDelta: regionDeltaRef.current.longitudeDelta,
        },
        500
      );
    } else if (Platform.OS === 'web') {
      const targetLat = currentLocation?.latitude || computedInitialRegion.latitude;
      const targetLng = currentLocation?.longitude || computedInitialRegion.longitude;
      postToLeaflet({ type: 'RECENTER', lat: targetLat, lng: targetLng });
    }
  }, [currentLocation, computedInitialRegion, postToLeaflet]);

  const handleZoomIn = useCallback(() => {
    if (Platform.OS !== 'web' && mapRef.current) {
      const nextLatDelta = Math.max(0.001, regionDeltaRef.current.latitudeDelta / 1.5);
      const nextLngDelta = Math.max(0.001, regionDeltaRef.current.longitudeDelta / 1.5);
      regionDeltaRef.current = { latitudeDelta: nextLatDelta, longitudeDelta: nextLngDelta };

      const centerLat = currentLocation?.latitude || computedInitialRegion.latitude;
      const centerLng = currentLocation?.longitude || computedInitialRegion.longitude;

      mapRef.current.animateToRegion(
        {
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: nextLatDelta,
          longitudeDelta: nextLngDelta,
        },
        300
      );
    } else if (Platform.OS === 'web') {
      postToLeaflet({ type: 'ZOOM_IN' });
    }
  }, [currentLocation, computedInitialRegion, postToLeaflet]);

  const handleZoomOut = useCallback(() => {
    if (Platform.OS !== 'web' && mapRef.current) {
      const nextLatDelta = Math.min(0.2, regionDeltaRef.current.latitudeDelta * 1.5);
      const nextLngDelta = Math.min(0.2, regionDeltaRef.current.longitudeDelta * 1.5);
      regionDeltaRef.current = { latitudeDelta: nextLatDelta, longitudeDelta: nextLngDelta };

      const centerLat = currentLocation?.latitude || computedInitialRegion.latitude;
      const centerLng = currentLocation?.longitude || computedInitialRegion.longitude;

      mapRef.current.animateToRegion(
        {
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: nextLatDelta,
          longitudeDelta: nextLngDelta,
        },
        300
      );
    } else if (Platform.OS === 'web') {
      postToLeaflet({ type: 'ZOOM_OUT' });
    }
  }, [currentLocation, computedInitialRegion, postToLeaflet]);

  // =========================================================================
  // 1. PRIMARY NATIVE RENDERER: React Native Maps for iOS & Android
  // =========================================================================
  if (Platform.OS !== 'web' && RNMapView) {
    return (
      <View
        style={[
          isFullScreenMode
            ? styles.fullScreenContainer
            : [styles.container, { borderColor: colors.primary, shadowColor: colors.primary }],
          style,
        ]}
      >
        <RNMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={computedInitialRegion}
          showsUserLocation={false}
          showsCompass={false}
          showsMyLocationButton={false}
          customMapStyle={jogpalDarkMapStyle}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          pitchEnabled={false}
          onRegionChangeComplete={(region: any) => {
            if (region?.latitudeDelta && region?.longitudeDelta) {
              regionDeltaRef.current = {
                latitudeDelta: region.latitudeDelta,
                longitudeDelta: region.longitudeDelta,
              };
            }
          }}
          onRegionChange={(region: any, details: any) => {
            // Recognize user pinch, drag, or double-tap gestures to pause follow mode
            if (details?.isGesture && cameraMode !== 'USER_CONTROLLED') {
              setCameraMode('USER_CONTROLLED');
            }
          }}
          onPanDrag={() => {
            if (cameraMode !== 'USER_CONTROLLED') {
              setCameraMode('USER_CONTROLLED');
            }
          }}
          onMapReady={() => {
            setIsMapReady(true);
            if (fitRouteOnLoad && sanitizedActualRoute.length > 0) {
              fitNativeRouteBounds();
            }
            if (onMapLoaded) onMapLoaded();
          }}
        >
          {/* OpenStreetMap (OSM) Dark Matter Raster Tile Layer */}
          {RNUrlTile && (
            <RNUrlTile
              urlTemplate={MAP_CONFIG.darkRasterTileURL}
              maximumZ={19}
              flipY={false}
              zIndex={-1}
            />
          )}

          {/* Actual GPS Route Polyline */}
          {sanitizedActualRoute.length > 1 && RNPolyline && (
            <RNPolyline
              coordinates={sanitizedActualRoute}
              strokeColor={colors.primary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Planned OSRM Route Polyline */}
          {sanitizedPlannedRoute.length > 1 && RNPolyline && (
            <RNPolyline
              coordinates={sanitizedPlannedRoute}
              strokeColor="#00E5FF"
              strokeWidth={4}
              lineDashPattern={[8, 6]}
            />
          )}

          {/* Start Marker */}
          {showStartFinishMarkers && sanitizedActualRoute.length > 0 && (
            <StartMarker coordinate={sanitizedActualRoute[0]} />
          )}

          {/* Finish Marker */}
          {showStartFinishMarkers && sanitizedActualRoute.length > 1 && (
            <FinishMarker coordinate={sanitizedActualRoute[sanitizedActualRoute.length - 1]} />
          )}

          {/* Live Runner Position Marker with Accuracy Halo & Direction */}
          {currentLocation && RNMarker && (
            <RNMarker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerAnchor}>
                {/* Accuracy Halo */}
                <View style={[styles.accuracyHalo, { borderColor: colors.primary, backgroundColor: colors.glow }]} />
                {/* Direction Cone if heading available */}
                {currentLocation.heading !== null && currentLocation.heading >= 0 && (
                  <View style={[styles.headingCone, { transform: [{ rotate: `${currentLocation.heading}deg` }] }]}>
                    <View style={[styles.headingArrow, { borderBottomColor: colors.primary }]} />
                  </View>
                )}
                {/* Center Runner Dot */}
                <View style={[styles.runnerCore, { backgroundColor: colors.primary }]} />
              </View>
            </RNMarker>
          )}

          {/* Partner / Squad Runners Markers */}
          {partnerRunners.map((partner, idx) => (
            <PartnerMarker
              key={partner.id}
              runner={partner}
              accentColor={SQUAD_COLORS[idx % SQUAD_COLORS.length]}
            />
          ))}
        </RNMapView>

        {/* FULLSCREEN Floating Right-Side Controls */}
        {interactive && isFullScreenMode && (
          <View style={styles.fullScreenControlGroup} pointerEvents="box-none">
            {showRecenterButton && (
              <TouchableOpacity
                style={[
                  styles.sideControlBtn,
                  {
                    backgroundColor: 'rgba(14, 14, 20, 0.92)',
                    borderColor: cameraMode === 'FOLLOWING' ? colors.primary : '#33333E',
                  },
                ]}
                onPress={handleCompassPress}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="navigation"
                  size={20}
                  color={cameraMode === 'FOLLOWING' ? colors.primary : '#FFFFFF'}
                  style={styles.compassIcon}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.sideControlBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sideControlBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <Feather name="minus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STANDARD CARD Controls */}
        {interactive && !isFullScreenMode && showRecenterButton && (
          <TouchableOpacity
            style={[
              styles.compassBtn,
              {
                backgroundColor: 'rgba(20, 20, 24, 0.92)',
                borderColor: cameraMode === 'FOLLOWING' ? colors.primary : '#33333E',
              },
            ]}
            onPress={handleCompassPress}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="navigation"
              size={20}
              color={cameraMode === 'FOLLOWING' ? colors.primary : '#FFFFFF'}
              style={styles.compassIcon}
            />
          </TouchableOpacity>
        )}

        {interactive && !isFullScreenMode && (
          <View style={styles.zoomControlGroup}>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: 'rgba(20, 20, 24, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: 'rgba(20, 20, 24, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <Feather name="minus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // =========================================================================
  // 2. UNIVERSAL RENDERER FOR WEB: Interactive Leaflet Dark Street Map
  // =========================================================================
  if (Platform.OS === 'web') {
    const lat = computedInitialRegion.latitude;
    const lng = computedInitialRegion.longitude;
    const actualCoords = sanitizedActualRoute.map((p) => [p.latitude, p.longitude]);
    const plannedCoords = sanitizedPlannedRoute.map((p) => [p.latitude, p.longitude]);

    const leafletHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #0E0F14; overflow: hidden; }
            .leaflet-container { background: #0E0F14 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .runner-halo {
              width: 28px; height: 28px; border-radius: 14px;
              background: ${colors.glow}; border: 2px solid ${colors.primary};
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 0 12px ${colors.glow};
            }
            .runner-dot { width: 10px; height: 10px; border-radius: 5px; background: ${colors.primary}; }
            .start-badge {
              background: #00FF66; color: #000; font-size: 8px; font-weight: 900;
              padding: 2px 6px; border-radius: 4px; border: 1px solid #FFF; white-space: nowrap;
              box-shadow: 0 0 6px rgba(0,255,102,0.6);
            }
            .finish-badge {
              background: #FF3B30; color: #FFF; font-size: 8px; font-weight: 900;
              padding: 2px 6px; border-radius: 4px; border: 1px solid #FFF; white-space: nowrap;
              box-shadow: 0 0 6px rgba(255,59,48,0.6);
            }
            .partner-container {
              display: flex; flex-direction: column; align-items: center; pointer-events: none;
            }
            .partner-halo {
              width: 30px; height: 30px; border-radius: 15px;
              background: #1C1C1E; border: 2px solid #A8FF00;
              display: flex; align-items: center; justify-content: center;
              overflow: hidden; font-size: 11px; font-weight: 800; color: #FFFFFF;
              box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            }
            .partner-tag {
              background: rgba(14, 15, 20, 0.92); border: 1px solid #2A2A35;
              border-radius: 5px; padding: 1px 5px; margin-top: 2px;
              display: flex; flex-direction: column; align-items: center; white-space: nowrap;
            }
            .partner-name { font-size: 9px; font-weight: 700; color: #FFFFFF; line-height: 11px; }
            .partner-dist { font-size: 8px; font-weight: 800; line-height: 10px; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var isFollowing = true;
            var SQUAD_COLORS = ['#A8FF00', '#00E5FF', '#FF0055', '#FFB800', '#BD00FF'];
            var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 16);
            
            // High contrast dark OpenStreetMap (OSM) Carto raster tiles
            L.tileLayer('${MAP_CONFIG.darkRasterTileURL}', {
              maxZoom: 19,
              subdomains: 'abcd',
              attribution: ''
            }).addTo(map);

            var runnerIcon = L.divIcon({
              className: '',
              html: '<div class="runner-halo"><div class="runner-dot"></div></div>',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
            var marker = L.marker([${lat}, ${lng}], { icon: runnerIcon }).addTo(map);
            var polyline = L.polyline(${JSON.stringify(actualCoords)}, {
              color: '${colors.primary}',
              weight: 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);

            var partnerMarkers = {};
            function renderPartners(list) {
              Object.keys(partnerMarkers).forEach(function(k) {
                map.removeLayer(partnerMarkers[k]);
                delete partnerMarkers[k];
              });
              if (!list || !Array.isArray(list)) return;
              list.forEach(function(p, idx) {
                if (p && typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                  var color = SQUAD_COLORS[idx % SQUAD_COLORS.length];
                  var initial = (p.name || 'P').substring(0, 1).toUpperCase();
                  var avatarContent = p.avatarUrl
                    ? '<img src="' + p.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;" />'
                    : initial;
                  var distanceTag = p.distanceMeters !== undefined
                    ? '<div class="partner-dist" style="color:' + color + '">' + (p.distanceMeters < 1000 ? Math.round(p.distanceMeters) + 'm' : (p.distanceMeters / 1000).toFixed(1) + 'km') + '</div>'
                    : '';

                  var icon = L.divIcon({
                    className: '',
                    html: '<div class="partner-container">' +
                            '<div class="partner-halo" style="border-color:' + color + ';box-shadow:0 0 8px ' + color + '60;">' + avatarContent + '</div>' +
                            '<div class="partner-tag"><div class="partner-name">' + (p.name || 'Partner') + '</div>' + distanceTag + '</div>' +
                          '</div>',
                    iconSize: [42, 52],
                    iconAnchor: [21, 21]
                  });
                  partnerMarkers[p.id] = L.marker([p.latitude, p.longitude], { icon: icon }).addTo(map);
                }
              });
            }
            renderPartners(${JSON.stringify(partnerRunners || [])});

            ${plannedCoords.length > 1 ? `
              L.polyline(${JSON.stringify(plannedCoords)}, {
                color: '#555566',
                weight: 3,
                dashArray: '5, 5'
              }).addTo(map);
            ` : ''}

            ${showStartFinishMarkers && actualCoords.length > 0 ? `
              var startIcon = L.divIcon({ className: '', html: '<div class="start-badge">START</div>', iconAnchor: [16, 8] });
              L.marker(${JSON.stringify(actualCoords[0])}, { icon: startIcon }).addTo(map);
            ` : ''}

            ${showStartFinishMarkers && actualCoords.length > 1 ? `
              var endIcon = L.divIcon({ className: '', html: '<div class="finish-badge">END</div>', iconAnchor: [14, 8] });
              L.marker(${JSON.stringify(actualCoords[actualCoords.length - 1])}, { icon: endIcon }).addTo(map);
            ` : ''}

            ${fitRouteOnLoad && actualCoords.length > 1 ? `
              try { map.fitBounds(polyline.getBounds(), { padding: [35, 35], maxZoom: 17 }); } catch(e) {}
            ` : ''}

            map.on('dragstart', function() {
              isFollowing = false;
              window.parent.postMessage({ type: 'USER_INTERACTION' }, '*');
            });

            window.addEventListener('message', function(event) {
              if (!event.data) return;
              var data = event.data;

              if (data.type === 'UPDATE_LOCATION') {
                var nLat = data.lat;
                var nLng = data.lng;
                if (nLat && nLng) {
                  marker.setLatLng([nLat, nLng]);
                  if (isFollowing && data.cameraMode === 'FOLLOWING') {
                    map.panTo([nLat, nLng], { animate: true, duration: 0.7 });
                  }
                }
                if (data.actualCoords && data.actualCoords.length > 0) {
                  polyline.setLatLngs(data.actualCoords);
                }
                if (data.partners) {
                  renderPartners(data.partners);
                }
              } else if (data.type === 'UPDATE_PARTNERS') {
                renderPartners(data.partners);
              } else if (data.type === 'RECENTER') {
                isFollowing = true;
                if (data.lat && data.lng) {
                  map.panTo([data.lat, data.lng], { animate: true });
                }
              } else if (data.type === 'ZOOM_IN') {
                map.zoomIn();
              } else if (data.type === 'ZOOM_OUT') {
                map.zoomOut();
              } else if (data.type === 'INIT_STATE') {
                if (data.partners) {
                  renderPartners(data.partners);
                }
                if (data.fitRouteOnLoad && data.actualCoords && data.actualCoords.length > 1) {
                  try { map.fitBounds(polyline.getBounds(), { padding: [35, 35], maxZoom: 17 }); } catch(e) {}
                }
              }
            });

            // Ensure tiles are correctly laid out after container dimension stabilization
            setTimeout(function() { map.invalidateSize(); }, 150);
            window.addEventListener('resize', function() { map.invalidateSize(); });

            // Signal ready to parent window
            window.parent.postMessage({ type: 'LEAFLET_READY' }, '*');
          </script>
        </body>
      </html>
    `;

    return (
      <View
        style={[
          isFullScreenMode
            ? styles.fullScreenContainer
            : [styles.container, { borderColor: colors.primary, shadowColor: colors.primary }],
          style,
        ]}
      >
        <iframe
          ref={iframeRef}
          srcDoc={leafletHTML}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: isFullScreenMode ? 0 : 20 }}
          title="JOGPAL Web Map"
        />

        {/* FULLSCREEN Floating Right-Side Controls */}
        {interactive && isFullScreenMode && (
          <View style={styles.fullScreenControlGroup} pointerEvents="box-none">
            {showRecenterButton && (
              <TouchableOpacity
                style={[
                  styles.sideControlBtn,
                  {
                    backgroundColor: 'rgba(14, 14, 20, 0.92)',
                    borderColor: cameraMode === 'FOLLOWING' ? colors.primary : '#33333E',
                  },
                ]}
                onPress={handleCompassPress}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="navigation"
                  size={20}
                  color={cameraMode === 'FOLLOWING' ? colors.primary : '#FFFFFF'}
                  style={styles.compassIcon}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.sideControlBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sideControlBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <Feather name="minus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STANDARD CARD Controls */}
        {interactive && !isFullScreenMode && showRecenterButton && (
          <TouchableOpacity
            style={[
              styles.compassBtn,
              {
                backgroundColor: 'rgba(20, 20, 24, 0.92)',
                borderColor: cameraMode === 'FOLLOWING' ? colors.primary : '#33333E',
              },
            ]}
            onPress={handleCompassPress}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="navigation"
              size={20}
              color={cameraMode === 'FOLLOWING' ? colors.primary : '#FFFFFF'}
              style={styles.compassIcon}
            />
          </TouchableOpacity>
        )}

        {interactive && !isFullScreenMode && (
          <View style={styles.zoomControlGroup}>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: 'rgba(20, 20, 24, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: 'rgba(20, 20, 24, 0.92)', borderColor: '#33333E' }]}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <Feather name="minus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // =========================================================================
  // 3. FALLBACK SYNTHETIC MAP FOR UNKNOWN PLATFORMS
  // =========================================================================
  return (
    <OfflineSyntheticMap
      currentDistanceKm={0}
      targetDistanceKm={5}
      routeMode="LOOP"
      style={style}
      isFullScreen={isFullScreenMode}
    />
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
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#0E0F14',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerAnchor: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyHalo: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    opacity: 0.85,
  },
  runnerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headingCone: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headingArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  startBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#00FF66',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  startBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  finishBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  finishBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  partnerMarkerRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    backgroundColor: '#1E1E24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInitial: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
  fullScreenControlGroup: {
    position: 'absolute',
    right: 14,
    top: '42%',
    gap: 10,
    zIndex: 25,
    alignItems: 'center',
  },
  sideControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
});
