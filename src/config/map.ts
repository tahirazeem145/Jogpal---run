/**
 * Centralized MapLibre and OpenStreetMap configuration for Jogpal
 * All style URLs, tile providers, and styling tokens are managed here.
 * Never hardcode secrets; use EXPO_PUBLIC_MAP_STYLE_URL or EXPO_PUBLIC_MAP_API_KEY if required.
 */

export const MAP_CONFIG = {
  // Full Street-Level Vector Map Style (Carto Dark Matter GL / OpenFreeMap Dark)
  // Provides high-contrast dark asphalt streets, roads, buildings, parks, and labels
  styleURL:
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ||
    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',

  apiKey: process.env.EXPO_PUBLIC_MAP_API_KEY || '',

  // Camera Defaults (Street-level zoom for running)
  defaultZoom: 16.5,
  minZoom: 2,
  maxZoom: 19,
  defaultCenterCoordinate: [-122.4324, 37.78825] as [number, number], // [longitude, latitude]

  // Dynamic Camera Following Throttle
  cameraFollowThrottleMs: 800,

  // Route & Polyline Styling Configuration
  routeStyling: {
    lineWidth: 5,
    ghostLineWidth: 3,
    plannedLineWidth: 3,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    plannedDashArray: [2, 2],
    ghostDashArray: [3, 2],
    ghostLineOpacity: 0.7,
    plannedLineColor: '#555566',
  },

  // GPS Location Tracking Profile for Jogpal
  locationSettings: {
    timeInterval: 1000, // 1 second interval
    distanceInterval: 1, // 1 meter update sensitivity
    maxAccuracyThresholdMeters: 80, // Allow GPS points up to 80m for initial lock, tightening continuously
    maxMapAccuracyThresholdMeters: 150, // GPS points for map centering
    stationaryJitterThresholdMeters: 1.5, // 1.5m movement threshold to accumulate running distance
    maxReasonableSpeedMs: 15.0, // 15 m/s (~54 km/h) max reasonable running/sprinting speed
  },
};
