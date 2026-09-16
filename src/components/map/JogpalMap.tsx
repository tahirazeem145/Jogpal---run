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
import { OfflineSyntheticMap } from './OfflineSyntheticMap';
import { locationService } from '../../services/locationService';
import { StartBadge } from './StartMarker';
import { FinishBadge } from './FinishMarker';
import { PartnerBadge } from './PartnerMarker';

const SQUAD_COLORS = ['#A8FF00', '#00E5FF', '#FF0055', '#FFB800', '#BD00FF'];

// Pure open-source MapLibre Native for mobile devices (Zero Google Maps dependencies)
let MLMap: any = null;
let MLCamera: any = null;
let MLLayer: any = null;
let MLGeoJSONSource: any = null;
let MLMarker: any = null;

if (Platform.OS !== 'web') {
  try {
    const ML = require('@maplibre/maplibre-react-native');
    MLMap = ML.Map;
    MLCamera = ML.Camera;
    MLLayer = ML.Layer;
    MLGeoJSONSource = ML.GeoJSONSource;
    MLMarker = ML.Marker;
  } catch (err) {
    console.warn('[JogpalMap] MapLibre Native failed to load:', err);
  }
}

export const JogpalMap: React.FC<JogpalMapProps> = ({
  currentLocation,
  actualRoute = [],
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
  const [hasNativeMapError, setHasNativeMapError] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MAP_CONFIG.defaultZoom);

  const cameraRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const isLeafletReadyRef = useRef<boolean>(false);
  const lastCameraUpdateRef = useRef<number>(0);

  // Sanitize coordinates to prevent crashes from NaN or malformed coordinates
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

  // Initial center [longitude, latitude] for MapLibre
  const initialCenterLngLat = useMemo((): [number, number] => {
    if (currentLocation) {
      return [currentLocation.longitude, currentLocation.latitude];
    }
    if (sanitizedPlannedRoute.length > 0) {
      return [sanitizedPlannedRoute[0].longitude, sanitizedPlannedRoute[0].latitude];
    }
    if (sanitizedActualRoute.length > 0) {
      return [sanitizedActualRoute[0].longitude, sanitizedActualRoute[0].latitude];
    }
    const cached = locationService.getCachedLocation();
    if (cached) {
      return [cached.longitude, cached.latitude];
    }
    return MAP_CONFIG.defaultCenterCoordinate;
  }, [currentLocation, sanitizedPlannedRoute, sanitizedActualRoute]);

  // GeoJSON LineStrings for hardware-accelerated polyline rendering
  const actualRouteGeoJSON = useMemo(() => {
    if (sanitizedActualRoute.length < 2) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: sanitizedActualRoute.map((pt) => [pt.longitude, pt.latitude]),
      },
      properties: {},
    };
  }, [sanitizedActualRoute]);

  const plannedRouteGeoJSON = useMemo(() => {
    if (sanitizedPlannedRoute.length < 2) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: sanitizedPlannedRoute.map((pt) => [pt.longitude, pt.latitude]),
      },
      properties: {},
    };
  }, [sanitizedPlannedRoute]);

  // Throttled native camera tracking
  useEffect(() => {
    if (Platform.OS === 'web' || !MLMap || !cameraRef.current || !isMapReady) return;

    if (currentLocation && cameraMode === 'FOLLOWING' && !fitRouteOnLoad) {
      const now = Date.now();
      if (now - lastCameraUpdateRef.current >= MAP_CONFIG.cameraFollowThrottleMs) {
        lastCameraUpdateRef.current = now;
        try {
          cameraRef.current.easeTo({
            center: [currentLocation.longitude, currentLocation.latitude],
            duration: 700,
          });
        } catch (e) {}
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, cameraMode, fitRouteOnLoad, isMapReady]);

  // Fit bounds to route
  const fitNativeRouteBounds = useCallback(() => {
    if (Platform.OS === 'web' || !cameraRef.current) return;
    const pts = sanitizedActualRoute.length > 1 ? sanitizedActualRoute : sanitizedPlannedRoute;
    if (pts.length < 2) return;

    let minLat = pts[0].latitude;
    let maxLat = pts[0].latitude;
    let minLng = pts[0].longitude;
    let maxLng = pts[0].longitude;

    for (let i = 1; i < pts.length; i++) {
      if (pts[i].latitude < minLat) minLat = pts[i].latitude;
      if (pts[i].latitude > maxLat) maxLat = pts[i].latitude;
      if (pts[i].longitude < minLng) minLng = pts[i].longitude;
      if (pts[i].longitude > maxLng) maxLng = pts[i].longitude;
    }

    try {
      // MapLibre bounds: [west, south, east, north]
      cameraRef.current.fitBounds([minLng, minLat, maxLng, maxLat], {
        duration: 1000,
        padding: { top: 60, right: 60, bottom: 60, left: 60 },
      });
    } catch (e) {}
  }, [sanitizedActualRoute, sanitizedPlannedRoute]);

  useEffect(() => {
    if (fitRouteOnLoad && isMapReady && (sanitizedActualRoute.length > 1 || sanitizedPlannedRoute.length > 1)) {
      fitNativeRouteBounds();
    }
  }, [fitRouteOnLoad, isMapReady, fitNativeRouteBounds, sanitizedActualRoute.length, sanitizedPlannedRoute.length]);

  // Web Leaflet communication
  const postToLeaflet = useCallback((message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWebMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'LEAFLET_READY') {
        isLeafletReadyRef.current = true;
        setIsMapReady(true);
        if (onMapLoaded) onMapLoaded();
        postToLeaflet({
          type: 'INIT_STATE',
          actualCoords: sanitizedActualRoute.map((p) => [p.latitude, p.longitude]),
          partners: partnerRunners,
          fitRouteOnLoad,
        });
      } else if (event.data.type === 'USER_INTERACTION') {
        setCameraMode('USER_CONTROLLED');
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => window.removeEventListener('message', handleWebMessage);
  }, [partnerRunners, sanitizedActualRoute, fitRouteOnLoad, postToLeaflet, onMapLoaded]);

  // Recenter button
  const handleCompassPress = useCallback(() => {
    setCameraMode('FOLLOWING');
    if (Platform.OS !== 'web' && cameraRef.current && currentLocation) {
      try {
        cameraRef.current.easeTo({
          center: [currentLocation.longitude, currentLocation.latitude],
          duration: 500,
        });
      } catch (e) {}
    } else if (Platform.OS === 'web' && currentLocation) {
      postToLeaflet({
        type: 'RECENTER',
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
    }
  }, [currentLocation, postToLeaflet]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (Platform.OS !== 'web' && cameraRef.current) {
      const nextZoom = Math.min(MAP_CONFIG.maxZoom, currentZoom + 1);
      setCurrentZoom(nextZoom);
      try {
        cameraRef.current.zoomTo(nextZoom, { duration: 300 });
      } catch (e) {}
    } else if (Platform.OS === 'web') {
      postToLeaflet({ type: 'ZOOM_IN' });
    }
  }, [currentZoom, postToLeaflet]);

  const handleZoomOut = useCallback(() => {
    if (Platform.OS !== 'web' && cameraRef.current) {
      const nextZoom = Math.max(MAP_CONFIG.minZoom, currentZoom - 1);
      setCurrentZoom(nextZoom);
      try {
        cameraRef.current.zoomTo(nextZoom, { duration: 300 });
      } catch (e) {}
    } else if (Platform.OS === 'web') {
      postToLeaflet({ type: 'ZOOM_OUT' });
    }
  }, [currentZoom, postToLeaflet]);

  // =========================================================================
  // 1. PRIMARY NATIVE RENDERER: 100% Open-Source MapLibre Native (No Google)
  // =========================================================================
  if (Platform.OS !== 'web' && MLMap && !hasNativeMapError) {
    return (
      <View style={[styles.container, { borderColor: colors.primary, shadowColor: colors.primary }, style]}>
        <MLMap
          style={styles.map}
          mapStyle={MAP_CONFIG.styleURL}
          logo={false}
          attribution={false}
          compass={false}
          scaleBar={false}
          onRegionDidChange={() => {
            if (cameraMode !== 'USER_CONTROLLED') {
              setCameraMode('USER_CONTROLLED');
            }
          }}
          onDidFinishLoadingMap={() => {
            setIsMapReady(true);
            if (fitRouteOnLoad) {
              fitNativeRouteBounds();
            }
            if (onMapLoaded) onMapLoaded();
          }}
          onDidFailLoadingMap={(e: any) => {
            console.warn('[JogpalMap] Native map style load error:', e);
            setHasNativeMapError(true);
            if (onMapError) onMapError(e);
          }}
        >
          <MLCamera
            ref={cameraRef}
            initialViewState={{
              center: initialCenterLngLat,
              zoom: MAP_CONFIG.defaultZoom,
            }}
          />

          {/* Actual GPS Run Polyline (High-contrast Neon Primary) */}
          {actualRouteGeoJSON && MLGeoJSONSource && MLLayer && (
            <MLGeoJSONSource id="jogpalActualRouteSource" data={actualRouteGeoJSON}>
              <MLLayer
                id="jogpalActualRouteLayer"
                type="line"
                paint={{
                  'line-color': colors.primary,
                  'line-width': 5,
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
              />
            </MLGeoJSONSource>
          )}

          {/* Planned OSRM Pedestrian Circuit Polyline (Neon Cyan) */}
          {plannedRouteGeoJSON && MLGeoJSONSource && MLLayer && (
            <MLGeoJSONSource id="jogpalPlannedRouteSource" data={plannedRouteGeoJSON}>
              <MLLayer
                id="jogpalPlannedRouteLayer"
                type="line"
                paint={{
                  'line-color': '#00E5FF',
                  'line-width': 4,
                  'line-dasharray': [2, 2],
                }}
              />
            </MLGeoJSONSource>
          )}

          {/* Start Marker */}
          {showStartFinishMarkers && sanitizedActualRoute.length > 0 && MLMarker && (
            <MLMarker
              id="jogpalStartMarker"
              coordinate={[sanitizedActualRoute[0].longitude, sanitizedActualRoute[0].latitude]}
              anchor="center"
            >
              <StartBadge />
            </MLMarker>
          )}

          {/* Finish Marker */}
          {showStartFinishMarkers && sanitizedActualRoute.length > 1 && MLMarker && (
            <MLMarker
              id="jogpalFinishMarker"
              coordinate={[sanitizedActualRoute[sanitizedActualRoute.length - 1].longitude, sanitizedActualRoute[sanitizedActualRoute.length - 1].latitude]}
              anchor="center"
            >
              <FinishBadge />
            </MLMarker>
          )}

          {/* Live Runner Marker */}
          {currentLocation && MLMarker && (
            <MLMarker
              id="jogpalCurrentRunnerMarker"
              coordinate={[currentLocation.longitude, currentLocation.latitude]}
              anchor="center"
            >
              <View style={styles.markerAnchor}>
                <View style={[styles.accuracyHalo, { borderColor: colors.primary, backgroundColor: colors.glow }]} />
                {currentLocation.heading !== null && currentLocation.heading >= 0 && (
                  <View style={[styles.headingCone, { transform: [{ rotate: `${currentLocation.heading}deg` }] }]}>
                    <View style={[styles.headingArrow, { borderBottomColor: colors.primary }]} />
                  </View>
                )}
                <View style={[styles.runnerCore, { backgroundColor: colors.primary }]} />
              </View>
            </MLMarker>
          )}

          {/* Partner / Squad Runners */}
          {partnerRunners.map((partner, idx) => (
            MLMarker && (
              <MLMarker
                key={partner.id}
                id={`partner-${partner.id}`}
                coordinate={[partner.longitude, partner.latitude]}
                anchor="center"
              >
                <PartnerBadge runner={partner} accentColor={SQUAD_COLORS[idx % SQUAD_COLORS.length]} />
              </MLMarker>
            )
          ))}
        </MLMap>

        {/* Recenter / Compass Button */}
        {interactive && showRecenterButton && (
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

        {/* Zoom In / Zoom Out Controls */}
        {interactive && (
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
    const lat = initialCenterLngLat[1];
    const lng = initialCenterLngLat[0];
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
                color: '#00E5FF',
                weight: 4,
                dashArray: '6, 6'
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
      <View style={[styles.container, { borderColor: colors.primary, shadowColor: colors.primary }, style]}>
        <iframe
          ref={iframeRef}
          srcDoc={leafletHTML}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 20 }}
          title="JOGPAL Web Map"
        />

        {/* Recenter / Compass Control Button */}
        {interactive && showRecenterButton && (
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

        {/* Zoom In / Zoom Out Controls */}
        {interactive && (
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
  // 3. FALLBACK SYNTHETIC MAP: Guaranteed Offline Stadium Track
  // =========================================================================
  return (
    <OfflineSyntheticMap
      currentDistanceKm={0}
      targetDistanceKm={5}
      routeMode="LOOP"
      style={style}
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
