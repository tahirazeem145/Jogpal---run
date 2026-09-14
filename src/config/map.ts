/**
 * Centralized MapLibre and OpenStreetMap configuration for Jogpal
 * All style URLs, tile providers, and styling tokens are managed here.
 * Never hardcode secrets; use EXPO_PUBLIC_MAP_STYLE_URL or EXPO_PUBLIC_MAP_API_KEY if required.
 */

export const MAP_CONFIG = {
  // Full Street-Level Vector Map Style (OpenFreeMap Dark - 100% Free, No Watermark, No API Key Required)
  styleURL:
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ||
    'https://tiles.openfreemap.org/styles/dark',

  apiKey: process.env.EXPO_PUBLIC_MAP_API_KEY || '',

  // Camera Defaults (Street-level zoom for running)
  defaultZoom: 16.5,
  minZoom: 2,
  maxZoom: 19,
  defaultCenterCoordinate: [-122.4324, 37.78825] as [number, number], // [longitude, latitude]

  // Dynamic Camera Following Throttle (Prevents jittery continuous animations)
  cameraFollowThrottleMs: 1500,

  // Fast Crisp Dark Raster Tiles for Web (Watermark-Free OpenStreetMap)
  darkRasterTileURL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',

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
    distanceInterval: 2, // 2 meters update sensitivity (filters device micro-noise)
    maxAccuracyThresholdMeters: 30, // Strict 30m accuracy threshold for distance calculation & route logging
    maxMapAccuracyThresholdMeters: 65, // Max 65m accuracy for runner marker display
    stationaryJitterThresholdMeters: 3.5, // 3.5m physical displacement required to count as active movement
    maxReasonableSpeedMs: 11.5, // 11.5 m/s (~41.4 km/h) max reasonable sprinting speed
    maxSingleStepJumpMeters: 25, // 25 meters in a single second = teleport jump rejection
  },
};
