import * as Location from 'expo-location';
import { GPSPoint } from '../types/soloRun';

const EARTH_RADIUS_KM = 6371.0088;
const MAX_ACCURACY_THRESHOLD_METERS = 25; // reject points with accuracy > 25m for run tracking
const MAX_REASONABLE_SPEED_MS = 12.5; // ~45 km/h max speed threshold for running

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

export function isValidGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): boolean {
  // 1. Check coordinate bounds
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

  // 2. Check accuracy threshold for tracking
  if (point.accuracy !== null && point.accuracy > MAX_ACCURACY_THRESHOLD_METERS) {
    return false;
  }

  // 3. Compare with last accepted point if present
  if (lastPoint) {
    if (point.timestamp <= lastPoint.timestamp) {
      return false;
    }

    const timeDiffSeconds = (point.timestamp - lastPoint.timestamp) / 1000;
    if (timeDiffSeconds <= 0) return false;

    const segmentKm = calculateHaversineDistanceKm(
      lastPoint.latitude,
      lastPoint.longitude,
      point.latitude,
      point.longitude
    );

    const speedMs = (segmentKm * 1000) / timeDiffSeconds;
    if (speedMs > MAX_REASONABLE_SPEED_MS) {
      return false;
    }
  }

  return true;
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
        onPoint(point);
      }
    ).then((sub: Location.LocationSubscription) => {
      subscription = sub;
    }).catch((err: any) => {
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
