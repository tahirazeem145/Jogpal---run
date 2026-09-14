import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { GPSPoint } from '../types/soloRun';
import { MAP_CONFIG } from '../config/map';
import { runTrackingService, GPSValidationResult, GPSAccuracyTier } from './tracking/runTrackingService';

export { runTrackingService, GPSValidationResult, GPSAccuracyTier };
export const calculateHaversineDistanceKm = runTrackingService.calculateHaversineDistanceKm;
export const getAccuracyTier = runTrackingService.getAccuracyTier;
export const validateGPSPoint = runTrackingService.validateGPSPoint.bind(runTrackingService);
export const calculateRollingPaceString = runTrackingService.calculateRollingPaceString.bind(runTrackingService);
export const smoothGPSPoint = runTrackingService.smoothGPSPoint.bind(runTrackingService);
export const resetFilter = runTrackingService.resetFilter.bind(runTrackingService);

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

const isWeb = Platform.OS === 'web';
let cachedLastKnownLocation: GPSPoint | null = null;

export const locationService = {
  // Synchronous access to the most recent known valid GPS position
  getCachedLocation(): GPSPoint | null {
    return cachedLastKnownLocation;
  },
  // Check if hardware GPS services are enabled on device
  async checkServicesEnabled(): Promise<boolean> {
    if (isWeb) {
      return typeof window !== 'undefined' && 'geolocation' in navigator;
    }
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (e) {}
      }
      return await Location.hasServicesEnabledAsync();
    } catch (e) {
      console.warn('[LOCATION_SERVICE] Error checking location services:', e);
      return typeof window !== 'undefined' && 'geolocation' in navigator;
    }
  },

  // Request foreground location permissions (Fine / Precise)
  async requestPermissions(): Promise<boolean> {
    if (isWeb) {
      return typeof window !== 'undefined' && 'geolocation' in navigator;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (e) {}
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[LOCATION_SERVICE] Error requesting foreground permissions:', e);
      return typeof window !== 'undefined' && 'geolocation' in navigator;
    }
  },

  // Request background location permissions for continuous tracking
  async requestBackgroundPermissions(): Promise<boolean> {
    if (isWeb) return true;
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
    if (isWeb) {
      return Location.PermissionStatus.GRANTED;
    }
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status;
    } catch (e) {
      return Location.PermissionStatus.UNDETERMINED;
    }
  },

  // Fast last known position (cached) for immediate UI / map framing
  async getLastKnownLocation(): Promise<GPSPoint | null> {
    if (isWeb && typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (
              isNaN(pos.coords.latitude) ||
              isNaN(pos.coords.longitude) ||
              (pos.coords.latitude === 0 && pos.coords.longitude === 0)
            ) {
              resolve(null);
              return;
            }
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
              timestamp: pos.timestamp,
              speed: pos.coords.speed ?? null,
              heading: pos.coords.heading ?? null,
              altitude: pos.coords.altitude ?? null,
            });
          },
          () => resolve(null),
          { timeout: 3000, maximumAge: 60000, enableHighAccuracy: false }
        );
      });
    }
    try {
      const loc = await Location.getLastKnownPositionAsync({
        maxAge: 30000,
        requiredAccuracy: 50,
      });
      if (
        !loc ||
        !loc.coords ||
        isNaN(loc.coords.latitude) ||
        isNaN(loc.coords.longitude) ||
        (loc.coords.latitude === 0 && loc.coords.longitude === 0) ||
        loc.coords.latitude < -90 ||
        loc.coords.latitude > 90 ||
        loc.coords.longitude < -180 ||
        loc.coords.longitude > 180
      ) {
        return null;
      }
      const resultPoint: GPSPoint = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? null,
        heading: loc.coords.heading ?? null,
        altitude: loc.coords.altitude ?? null,
      };
      cachedLastKnownLocation = resultPoint;
      return resultPoint;
    } catch (e) {
      return null;
    }
  },

  // Quick initial location with balanced accuracy (< 3s timeout)
  async getQuickInitialLocation(): Promise<GPSPoint | null> {
    if (isWeb && typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (
              isNaN(pos.coords.latitude) ||
              isNaN(pos.coords.longitude) ||
              (pos.coords.latitude === 0 && pos.coords.longitude === 0)
            ) {
              resolve(null);
              return;
            }
            const pt: GPSPoint = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
              timestamp: pos.timestamp,
              speed: pos.coords.speed ?? null,
              heading: pos.coords.heading ?? null,
              altitude: pos.coords.altitude ?? null,
            };
            cachedLastKnownLocation = pt;
            resolve(pt);
          },
          () => resolve(null),
          { timeout: 3000, maximumAge: 10000, enableHighAccuracy: true }
        );
      });
    }
    try {
      const loc = (await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ])) as Location.LocationObject | null;

      if (
        !loc ||
        !loc.coords ||
        isNaN(loc.coords.latitude) ||
        isNaN(loc.coords.longitude) ||
        (loc.coords.latitude === 0 && loc.coords.longitude === 0) ||
        loc.coords.latitude < -90 ||
        loc.coords.latitude > 90 ||
        loc.coords.longitude < -180 ||
        loc.coords.longitude > 180
      ) {
        return null;
      }
      const quickPt: GPSPoint = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? null,
        heading: loc.coords.heading ?? null,
        altitude: loc.coords.altitude ?? null,
      };
      cachedLastKnownLocation = quickPt;
      return quickPt;
    } catch (e) {
      return null;
    }
  },

  // Continuous high-accuracy GPS watcher for active running
  watchLocation(
    onPoint: (point: GPSPoint) => void,
    onError?: (error: any) => void
  ): { remove: () => void } {
    if (isWeb && typeof window !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const point: GPSPoint = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            timestamp: pos.timestamp || Date.now(),
            speed: pos.coords.speed ?? null,
            heading: pos.coords.heading ?? null,
            altitude: pos.coords.altitude ?? null,
          };
          cachedLastKnownLocation = point;
          onPoint(point);
        },
        (err) => {
          console.warn('[WEB_GEOLOCATION_WATCH_WARN]', err);
          if (onError) onError(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );

      return {
        remove: () => {
          navigator.geolocation.clearWatch(watchId);
        },
      };
    }

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
        cachedLastKnownLocation = point;
        onPoint(point);
      },
      (err: any) => {
        if (onError) onError(err);
      }
    )
      .then((sub: Location.LocationSubscription) => {
        subscription = sub;
      })
      .catch((err: any) => {
        console.error('[LOCATION_WATCH_ERROR]', err);
        // Fallback to HTML5 Geolocation API on error
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              onPoint({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy ?? null,
                timestamp: pos.timestamp || Date.now(),
                speed: pos.coords.speed ?? null,
                heading: pos.coords.heading ?? null,
                altitude: pos.coords.altitude ?? null,
              });
            },
            (gErr) => {
              if (onError) onError(gErr);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
          subscription = { remove: () => navigator.geolocation.clearWatch(watchId) } as any;
        } else if (onError) {
          onError(err);
        }
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
