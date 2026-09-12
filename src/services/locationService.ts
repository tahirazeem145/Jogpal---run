import * as Location from 'expo-location';
import { GPSPoint } from '../types/soloRun';

const EARTH_RADIUS_KM = 6371.0088;
const MAX_MAP_ACCURACY_THRESHOLD_METERS = 100; // Map location centering threshold (< 100m)
const MAX_ACCURACY_THRESHOLD_METERS = 50; // Run distance tracking accuracy threshold (≤ 50m)
const MAX_REASONABLE_SPEED_MS = 12.0; // 12 m/s (~43.2 km/h) max speed threshold for running

export function isValidMapLocation(point: GPSPoint): boolean {
  if (
    isNaN(point.latitude) ||
    isNaN(point.longitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return false;
  }
  return point.accuracy === null || point.accuracy <= MAX_MAP_ACCURACY_THRESHOLD_METERS;
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export type GPSRejectionReason =
  | 'INVALID_COORDINATES'
  | 'LOW_ACCURACY'
  | 'STALE'
  | 'DUPLICATE'
  | 'IMPOSSIBLE_SPEED'
  | 'GPS_JUMP';

export interface GPSValidationResult {
  isValid: boolean;
  reason?: GPSRejectionReason;
}

export type GPSAccuracyTier = 'HIGH' | 'GOOD' | 'WEAK' | 'UNUSABLE';

export function getAccuracyTier(accuracy: number | null): GPSAccuracyTier {
  if (accuracy === null || accuracy > 50) return 'UNUSABLE';
  if (accuracy <= 10) return 'HIGH';
  if (accuracy <= 25) return 'GOOD';
  return 'WEAK';
}

export function validateGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): GPSValidationResult {
  // 1. Check coordinate bounds & invalid 0,0 location
  if (
    isNaN(point.latitude) ||
    isNaN(point.longitude) ||
    (point.latitude === 0 && point.longitude === 0) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return { isValid: false, reason: 'INVALID_COORDINATES' };
  }

  // 2. Check timestamp integrity
  if (isNaN(point.timestamp) || point.timestamp <= 0) {
    return { isValid: false, reason: 'STALE' };
  }

  // 3. Check accuracy threshold for tracking (≤ 50m required for running tracking)
  if (point.accuracy !== null && point.accuracy > MAX_ACCURACY_THRESHOLD_METERS) {
    return { isValid: false, reason: 'LOW_ACCURACY' };
  }

  // 4. Compare with last accepted point if present
  if (lastPoint) {
    if (point.timestamp <= lastPoint.timestamp) {
      return { isValid: false, reason: 'DUPLICATE' };
    }

    const timeDiffSeconds = (point.timestamp - lastPoint.timestamp) / 1000;
    if (timeDiffSeconds <= 0) return { isValid: false, reason: 'DUPLICATE' };

    const segmentKm = calculateHaversineDistanceKm(
      lastPoint.latitude,
      lastPoint.longitude,
      point.latitude,
      point.longitude
    );

    const speedMs = (segmentKm * 1000) / timeDiffSeconds;

    // Check both calculated speed and reported speed spikes (> 12 m/s max for running)
    if (speedMs > MAX_REASONABLE_SPEED_MS || (point.speed !== null && point.speed > MAX_REASONABLE_SPEED_MS)) {
      return { isValid: false, reason: speedMs > 30 ? 'GPS_JUMP' : 'IMPOSSIBLE_SPEED' };
    }
  }

  return { isValid: true };
}

// Calculate rolling window pace from recent accepted points (prevents single-point noise)
export function calculateRollingPaceString(recentPoints: GPSPoint[]): string {
  if (recentPoints.length < 2) return '--:--';
  
  const oldest = recentPoints[0];
  const newest = recentPoints[recentPoints.length - 1];
  const durationSecs = (newest.timestamp - oldest.timestamp) / 1000;
  
  if (durationSecs < 5) return '--:--';

  let windowDistKm = 0;
  for (let i = 1; i < recentPoints.length; i++) {
    windowDistKm += calculateHaversineDistanceKm(
      recentPoints[i - 1].latitude,
      recentPoints[i - 1].longitude,
      recentPoints[i].latitude,
      recentPoints[i].longitude
    );
  }

  if (windowDistKm < 0.01) return '--:--';

  const paceDecimalMinutes = (durationSecs / 60) / windowDistKm;
  if (!isFinite(paceDecimalMinutes) || paceDecimalMinutes > 30 || paceDecimalMinutes < 1.5) return '--:--';

  const mins = Math.floor(paceDecimalMinutes);
  const secs = Math.round((paceDecimalMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

export function isValidGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): boolean {
  return validateGPSPoint(point, lastPoint).isValid;
}

export const locationService = {
  async checkServicesEnabled(): Promise<boolean> {
    console.log('[GPS_SERVICES_CHECK] Checking if device location services are enabled');
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      console.log(`[GPS_SERVICES_RESULT] Location services enabled: ${enabled}`);
      return enabled;
    } catch (err) {
      console.warn('[GPS_SERVICES_RESULT] Error checking location services:', err);
      return false;
    }
  },

  async requestPermissions(): Promise<boolean> {
    console.log('[GPS_PERMISSION_CHECK] Requesting location permissions');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      console.log(`[GPS_PERMISSION_RESULT] Permission status: ${status} (Granted: ${granted})`);
      return granted;
    } catch (err) {
      console.warn('[GPS_PERMISSION_RESULT] Error requesting location permission:', err);
      return false;
    }
  },

  // STAGE 1 (FAST): Get last known position for near-instant map centering (< 500ms)
  async getLastKnownLocation(): Promise<GPSPoint | null> {
    try {
      const loc = await Location.getLastKnownPositionAsync();
      if (!loc) return null;
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? null,
        heading: loc.coords.heading ?? null,
        altitude: loc.coords.altitude ?? null,
      };
    } catch (err) {
      return null;
    }
  },

  // STAGE 1 (FAST): Get balanced current position for fast initial map positioning (< 1.5s)
  async getQuickInitialLocation(): Promise<GPSPoint | null> {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? null,
        heading: loc.coords.heading ?? null,
        altitude: loc.coords.altitude ?? null,
      };
    } catch (err) {
      return null;
    }
  },

  // STAGE 2 (TRACKING-QUALITY): High-accuracy watcher for distance and route tracking
  watchLocation(
    onPoint: (point: GPSPoint) => void,
    onError?: (error: any) => void
  ): { remove: () => void } {
    let subscription: Location.LocationSubscription | null = null;
    console.log('[GPS_WATCH_START] Initiating watchPositionAsync watcher');

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1500,
        distanceInterval: 2,
      },
      (loc: Location.LocationObject) => {
        const point: GPSPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          timestamp: loc.timestamp,
          speed: loc.coords.speed ?? null,
          heading: loc.coords.heading ?? null,
          altitude: loc.coords.altitude ?? null,
        };
        console.log(`[GPS_UPDATE] Lat: ${point.latitude.toFixed(6)}, Lng: ${point.longitude.toFixed(6)}, Accuracy: ${point.accuracy}m, Speed: ${point.speed}m/s, Time: ${point.timestamp}`);
        onPoint(point);
      }
    ).then((sub: Location.LocationSubscription) => {
      subscription = sub;
      console.log('[GPS_WATCH_STARTED] Location watcher active');
    }).catch((err: any) => {
      console.error('[GPS_WATCH_ERROR] Location watcher failed:', err);
      if (onError) onError(err);
    });

    return {
      remove: () => {
        console.log('[GPS_WATCH_STOP] Stopping location watcher');
        if (subscription) {
          subscription.remove();
          subscription = null;
        }
      },
    };
  },
};
