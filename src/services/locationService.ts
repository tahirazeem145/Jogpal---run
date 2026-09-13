import * as Location from 'expo-location';
import { GPSPoint } from '../types/soloRun';
import { MAP_CONFIG } from '../config/map';
import { runTrackingService, GPSValidationResult, GPSAccuracyTier } from './tracking/runTrackingService';

export { runTrackingService, GPSValidationResult, GPSAccuracyTier };
export const calculateHaversineDistanceKm = runTrackingService.calculateHaversineDistanceKm;
export const getAccuracyTier = runTrackingService.getAccuracyTier;
export const validateGPSPoint = runTrackingService.validateGPSPoint.bind(runTrackingService);
export const calculateRollingPaceString = runTrackingService.calculateRollingPaceString.bind(runTrackingService);

export function isValidGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): boolean {
  return runTrackingService.validateGPSPoint(point, lastPoint).isValid;
}

export function isValidMapLocation(point: GPSPoint): boolean {
  if (
    isNaN(point.latitude) ||
    isNaN(point.longitude) ||
    (point.latitude === 0 && point.longitude === 0) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return false;
  }
  return point.accuracy === null || point.accuracy <= MAP_CONFIG.locationSettings.maxMapAccuracyThresholdMeters;
}

export const locationService = {
  // Check if hardware GPS services are enabled on device
  async checkServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (e) {
      console.warn('[LOCATION_SERVICE] Error checking location services:', e);
      return false;
    }
  },

  // Request foreground location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('[LOCATION_SERVICE] Error requesting foreground permissions:', e);
      return false;
    }
  },

  // Request background location permissions for continuous tracking
  async requestBackgroundPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('[LOCATION_SERVICE] Background permission error:', e);
      return false;
    }
  },

  // Check current permission status without prompting
  async getPermissionStatus(): Promise<Location.PermissionStatus> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status;
    } catch (e) {
      return Location.PermissionStatus.UNDETERMINED;
    }
  },

  // Fast last known position (cached) for immediate UI / map framing
  async getLastKnownLocation(): Promise<GPSPoint | null> {
    try {
      const loc = await Location.getLastKnownPositionAsync({
        maxAge: 10000,
        requiredAccuracy: 50,
      });
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
    } catch (e) {
      return null;
    }
  },

  // Quick initial location with highest accuracy (< 1.5s)
  async getQuickInitialLocation(): Promise<GPSPoint | null> {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
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
    } catch (e) {
      return null;
    }
  },

  // Continuous high-accuracy GPS watcher for active running
  watchLocation(
    onPoint: (point: GPSPoint) => void,
    onError?: (error: any) => void
  ): { remove: () => void } {
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: MAP_CONFIG.locationSettings.timeInterval,
        distanceInterval: MAP_CONFIG.locationSettings.distanceInterval,
        mayShowUserSettingsDialog: true,
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
    )
      .then((sub: Location.LocationSubscription) => {
        subscription = sub;
      })
      .catch((err: any) => {
        console.error('[LOCATION_WATCH_ERROR]', err);
        if (onError) onError(err);
      });

    return {
      remove: () => {
        if (subscription) {
          subscription.remove();
          subscription = null;
        }
      },
    };
  },
};
