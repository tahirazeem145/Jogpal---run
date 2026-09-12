import React, { useRef, useEffect, useMemo } from 'react';
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
  // If Web environment, render web-safe interactive Leaflet / CartoDB Dark Matter map container
  if (Platform.OS === 'web') {
    const lat = currentLocation?.latitude || 37.78825;
    const lng = currentLocation?.longitude || -122.4324;
    const actualRouteCoords = actualRoute.map((p) => [p.latitude, p.longitude]);
    const plannedRouteCoords = plannedRoute.map((p) => [p.latitude, p.longitude]);

    const leafletHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #050505; }
            .leaflet-container { background: #050505 !important; }
            .dark-tiles {
              filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%);
            }
            .runner-marker {
              width: 24px; height: 24px; border-radius: 12px;
              background: rgba(168, 255, 0, 0.35); border: 2px solid ${colors.limePrimary};
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 0 10px rgba(168, 255, 0, 0.8);
            }
            .runner-inner { width: 10px; height: 10px; border-radius: 5px; background: ${colors.limePrimary}; }
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

            ${plannedRouteCoords.length > 1 ? `L.polyline(${JSON.stringify(plannedRouteCoords)}, { color: '#333333', weight: 4, dashArray: '8, 6' }).addTo(map);` : ''}
            ${actualRouteCoords.length > 1 ? `L.polyline(${JSON.stringify(actualRouteCoords)}, { color: '${colors.limePrimary}', weight: 5, opacity: 0.95 }).addTo(map);` : ''}
          </script>
        </body>
      </html>
    `;

    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={leafletHTML}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 20 }}
          title="JOGPAL Web Dark Map"
        />
      </View>
    );
  }

  // Native Android/iOS environment: safely require @maplibre/maplibre-react-native or fallback react-native-maps
  let MapLibre: any = null;
  let MapView: any = null;
  let Polyline: any = null;
  let Marker: any = null;
  let PROVIDER_DEFAULT: any = null;

  try {
    MapLibre = require('@maplibre/maplibre-react-native');
  } catch (err) {
    try {
      const Maps = require('react-native-maps');
      MapView = Maps.default;
      Polyline = Maps.Polyline;
      Marker = Maps.Marker;
      PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
    } catch (e) {}
  }

  const mapRef = useRef<any>(null);

  const initialRegion = useMemo(() => ({
    latitude: currentLocation?.latitude || 37.78825,
    longitude: currentLocation?.longitude || -122.4324,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  }), [currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      if (mapRef.current.animateToRegion) {
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
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  // Construct stable MapLibre GeoJSON sources
  const actualRouteGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: actualRoute.map((pt) => [pt.longitude, pt.latitude]),
        },
        properties: {},
      },
    ],
  }), [actualRoute]);

  const plannedRouteGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: plannedRoute.map((pt) => [pt.longitude, pt.latitude]),
        },
        properties: {},
      },
    ],
  }), [plannedRoute]);

  const centerCoordinate = useMemo(() => {
    if (!currentLocation) return undefined;
    return [currentLocation.longitude, currentLocation.latitude];
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  if (MapLibre && MapLibre.MapView) {
    const MapLibreGL = MapLibre.default || MapLibre;
    return (
      <View style={[styles.container, style]}>
        <MapLibreGL.MapView
          style={styles.map}
          styleURL={MapLibreGL.StyleURL?.DefaultDark || 'https://demotiles.maplibre.org/style.json'}
          logoEnabled={false}
          attributionEnabled={false}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          pitchEnabled={false}
        >
          {currentLocation && (
            <MapLibreGL.Camera
              centerCoordinate={[currentLocation.longitude, currentLocation.latitude]}
              zoomLevel={15.5}
              animationDuration={800}
            />
          )}

          {/* Planned Route Line Layer */}
          {plannedRoute.length > 1 && (
            <MapLibreGL.ShapeSource id="jogpalPlannedRoute" shape={plannedRouteGeoJSON}>
              <MapLibreGL.LineLayer
                id="jogpalPlannedLine"
                style={{
                  lineColor: '#333333',
                  lineWidth: 3,
                  lineDasharray: [2, 2],
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Actual Live GPS Route Layer */}
          {actualRoute.length > 1 && (
            <MapLibreGL.ShapeSource id="jogpalActualRoute" shape={actualRouteGeoJSON}>
              <MapLibreGL.LineLayer
                id="jogpalActualLine"
                style={{
                  lineColor: colors.limePrimary,
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Custom JOGPAL Neon Runner Marker */}
          {currentLocation && (
            <MapLibreGL.PointAnnotation
              id="jogpalRunnerMarker"
              coordinate={[currentLocation.longitude, currentLocation.latitude]}
            >
              <View style={styles.runnerMarkerOuter}>
                <View style={styles.runnerMarkerInner} />
              </View>
            </MapLibreGL.PointAnnotation>
          )}
        </MapLibreGL.MapView>
      </View>
    );
  }

  if (MapView) {
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
          {plannedRoute.length > 1 && (
            <Polyline
              coordinates={plannedRoute}
              strokeColor="#333333"
              strokeWidth={4}
              lineDashPattern={[8, 6]}
            />
          )}

          {actualRoute.length > 1 && (
            <Polyline
              coordinates={actualRoute}
              strokeColor={colors.limePrimary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              tracksViewChanges={false}
            >
              <View style={styles.runnerMarkerOuter}>
                <View style={styles.runnerMarkerInner} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.webContainer, style]}>
      <Text style={styles.webText}>JOGPAL MAPLIBRE (INITIALIZING ENGINE)</Text>
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
