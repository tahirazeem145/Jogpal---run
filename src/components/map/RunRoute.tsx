import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { LatLng } from '../../types/soloRun';
import { MAP_CONFIG } from '../../config/map';

let GeoJSONSource: any = null;
let Layer: any = null;
if (Platform.OS !== 'web') {
  try {
    const ML = require('@maplibre/maplibre-react-native');
    GeoJSONSource = ML.GeoJSONSource;
    Layer = ML.Layer;
  } catch (e) {}
}

interface RunRouteProps {
  actualRoute: LatLng[];
  plannedRoute?: LatLng[];
  routeColor: string;
}

export const RunRoute: React.FC<RunRouteProps> = React.memo(({
  actualRoute,
  plannedRoute = [],
  routeColor,
}) => {
  if (!GeoJSONSource || !Layer || Platform.OS === 'web') return null;

  // Memoize GeoJSON LineString for live GPS route
  const actualRouteGeoJSON = useMemo(() => {
    const coordinates = actualRoute.map((pt) => [pt.longitude, pt.latitude]);
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
          properties: {},
        },
      ],
    };
  }, [actualRoute]);

  // Memoize GeoJSON LineString for planned route
  const plannedRouteGeoJSON = useMemo(() => {
    const coordinates = plannedRoute.map((pt) => [pt.longitude, pt.latitude]);
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
          properties: {},
        },
      ],
    };
  }, [plannedRoute]);

  return (
    <>
      {/* Planned Guide Polyline Layer */}
      {plannedRoute.length > 1 && (
        <GeoJSONSource id="jogpalPlannedRouteSource" data={plannedRouteGeoJSON}>
          <Layer
            id="jogpalPlannedRouteLine"
            type="line"
            paint={{
              'line-color': MAP_CONFIG.routeStyling.plannedLineColor,
              'line-width': MAP_CONFIG.routeStyling.plannedLineWidth,
              'line-dasharray': MAP_CONFIG.routeStyling.plannedDashArray,
            }}
            layout={{
              'line-cap': MAP_CONFIG.routeStyling.lineCap,
            }}
          />
        </GeoJSONSource>
      )}

      {/* Actual Live GPS Route Polyline Layer */}
      {actualRoute.length > 1 && (
        <GeoJSONSource id="jogpalActualRouteSource" data={actualRouteGeoJSON}>
          <Layer
            id="jogpalActualRouteLine"
            type="line"
            paint={{
              'line-color': routeColor,
              'line-width': MAP_CONFIG.routeStyling.lineWidth,
            }}
            layout={{
              'line-cap': MAP_CONFIG.routeStyling.lineCap,
              'line-join': MAP_CONFIG.routeStyling.lineJoin,
            }}
          />
        </GeoJSONSource>
      )}
    </>
  );
});
