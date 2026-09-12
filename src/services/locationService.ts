import * as Location from 'expo-location';
import { GPSPoint } from '../types/soloRun';

const EARTH_RADIUS_KM = 6371.0088;
const MAX_MAP_ACCURACY_THRESHOLD_METERS = 100; // Map location centering threshold (< 100m)
const MAX_ACCURACY_THRESHOLD_METERS = 35; // Run distance tracking accuracy threshold (≤ 35m)
const MAX_REASONABLE_SPEED_MS = 12.5; // ~45 km/h max speed threshold for running

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

export function validateGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): GPSValidationResult {
  // 1. Check coordinate bounds
  if (
    isNaN(point.latitude) ||
    isNaN(point.longitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return { isValid: false, reason: 'INVALID_COORDINATES' };
  }

  // 2. Check accuracy threshold for tracking (≤ 25m required for running tracking)
  if (point.accuracy !== null && point.accuracy > MAX_ACCURACY_THRESHOLD_METERS) {
    return { isValid: false, reason: 'LOW_ACCURACY' };
  }

  // 3. Compare with last accepted point if present
  if (lastPoint) {
    if (point.timestamp < lastPoint.timestamp) {
      return { isValid: false, reason: 'STALE' };
    }
    if (point.timestamp === lastPoint.timestamp) {
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

    // Check for impossible speed spikes or sudden GPS teleportation jumps
    if (speedMs > MAX_REASONABLE_SPEED_MS) {
      return { isValid: false, reason: speedMs > 30 ? 'GPS_JUMP' : 'IMPOSSIBLE_SPEED' };
    }
  }

  return { isValid: true };
}

export function isValidGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): boolean {
  return validateGPSPoint(point, lastPoint).isValid;
}

export const locationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('Error requesting location permission:', err);
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

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const point: GPSPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          timestamp: loc.timestamp,
          speed: loc.coords.speed ?? null,
          heading: loc.coords.heading ?? null,
          altitude: loc.coords.altitude ?? null,
        };
        onPoint(point);
      }
    ).then((sub) => {
      subscription = sub;
    }).catch((err) => {
      if (onError) onError(err);
    });

    return {
      remove: () => {
        if (subscription) {
          subscription.remove();
        }
      },
    };
  },
};
