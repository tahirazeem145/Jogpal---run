import { GPSPoint } from '../../types/soloRun';
import { MAP_CONFIG } from '../../config/map';
import { gpsKalmanFilter } from './kalmanFilter';

const EARTH_RADIUS_KM = 6371.0088;

export interface GPSValidationResult {
  isValid: boolean;
  isReanchor?: boolean; // Signal to update reference point WITHOUT accumulating phantom distance
  reason?:
    | 'INVALID_COORDINATES'
    | 'LOW_ACCURACY'
    | 'STALE'
    | 'DUPLICATE'
    | 'IMPOSSIBLE_SPEED'
    | 'GPS_JUMP'
    | 'STATIONARY_NOISE';
}

export type GPSAccuracyTier = 'HIGH' | 'GOOD' | 'WEAK' | 'UNUSABLE';

export { gpsKalmanFilter };

export const runTrackingService = {
  // Haversine geospatial calculation between two lat/lng coordinates (km)
  calculateHaversineDistanceKm(
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
  },

  // Accuracy tier classification
  getAccuracyTier(accuracy: number | null): GPSAccuracyTier {
    if (accuracy === null || accuracy > MAP_CONFIG.locationSettings.maxAccuracyThresholdMeters) {
      return 'UNUSABLE';
    }
    if (accuracy <= 10) return 'HIGH';
    if (accuracy <= 20) return 'GOOD';
    return 'WEAK';
  },

  // Smooth a raw GPS point with the 2D Kalman Filter
  smoothGPSPoint(point: GPSPoint): GPSPoint {
    return gpsKalmanFilter.filter(point);
  },

  // Reset Kalman Filter (on pause, resume, or restart)
  resetFilter(): void {
    gpsKalmanFilter.reset();
  },

  /**
   * Comprehensive GPS Validation against spikes, stationary jitter, and inaccurate points.
   * Returns isValid and isReanchor flag.
   */
  validateGPSPoint(
    point: GPSPoint,
    lastPoint?: GPSPoint | null,
    pointCount = 0
  ): GPSValidationResult {
    // 1. Boundary & 0,0 Coordinate Checks
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

    // 2. Timestamp Integrity
    if (isNaN(point.timestamp) || point.timestamp <= 0) {
      return { isValid: false, reason: 'STALE' };
    }

    // 3. Strict Accuracy Threshold for Distance Tracking (<= 30m)
    if (
      point.accuracy !== null &&
      point.accuracy > MAP_CONFIG.locationSettings.maxAccuracyThresholdMeters
    ) {
      return { isValid: false, reason: 'LOW_ACCURACY' };
    }

    // 4. Differential Comparison with Last Valid Point
    if (lastPoint) {
      if (point.timestamp <= lastPoint.timestamp) {
        return { isValid: false, reason: 'DUPLICATE' };
      }

      const timeDiffSeconds = (point.timestamp - lastPoint.timestamp) / 1000;
      if (timeDiffSeconds <= 0) return { isValid: false, reason: 'DUPLICATE' };

      const segmentKm = this.calculateHaversineDistanceKm(
        lastPoint.latitude,
        lastPoint.longitude,
        point.latitude,
        point.longitude
      );
      const movementMeters = segmentKm * 1000;
      const calculatedSpeedMs = movementMeters / timeDiffSeconds;

      // 4a. Stationary GPS Noise / Drift Filter
      // Human running speed is >= 1.5 m/s (~5.4 km/h); walking is ~1.0-1.4 m/s.
      // If calculated displacement rate is below 0.85 m/s and device speed is low, or movement is under noise threshold:
      const deviceSpeed = point.speed !== null && point.speed >= 0 ? point.speed : calculatedSpeedMs;
      const noiseThresholdMeters = Math.max(
        MAP_CONFIG.locationSettings.stationaryJitterThresholdMeters,
        (point.accuracy || 12) * 0.45
      );

      if (
        (calculatedSpeedMs < 0.85 && deviceSpeed < 0.95) ||
        (deviceSpeed < 0.9 && movementMeters < noiseThresholdMeters)
      ) {
        return { isValid: false, reason: 'STATIONARY_NOISE' };
      }

      // 4b. Impossible Speed / Teleport Spikes (> 11.5 m/s / ~41.4 km/h)
      if (
        calculatedSpeedMs > MAP_CONFIG.locationSettings.maxReasonableSpeedMs ||
        (point.speed !== null && point.speed > MAP_CONFIG.locationSettings.maxReasonableSpeedMs) ||
        (timeDiffSeconds <= 2 && movementMeters > MAP_CONFIG.locationSettings.maxSingleStepJumpMeters)
      ) {
        return {
          isValid: false,
          reason:
            calculatedSpeedMs > 25 || movementMeters > MAP_CONFIG.locationSettings.maxSingleStepJumpMeters
              ? 'GPS_JUMP'
              : 'IMPOSSIBLE_SPEED',
        };
      }

      // 4c. Initial Settling (first 2 raw GPS points received)
      // During initial satellite lock warm-up, any jump > 5m or fast speed is a re-anchor
      if (pointCount <= 2) {
        if (movementMeters > 5 || calculatedSpeedMs > 4.0) {
          return { isValid: true, isReanchor: true };
        }
        return { isValid: true };
      }
    }

    return { isValid: true };
  },

  // Rolling window smoothed pace string in "M:SS /km"
  calculateRollingPaceString(recentPoints: GPSPoint[]): string {
    if (recentPoints.length < 3) return '--:--';

    // If there was a pause or signal gap (> 4s gap between points), only use points after the gap
    let validStartIdx = 0;
    for (let i = 1; i < recentPoints.length; i++) {
      const stepGap = (recentPoints[i].timestamp - recentPoints[i - 1].timestamp) / 1000;
      if (stepGap > 4.0) {
        validStartIdx = i;
      }
    }

    const movingPoints = recentPoints.slice(validStartIdx);
    if (movingPoints.length < 3) return '--:--';

    let totalDistKm = 0;
    const startPoint = movingPoints[0];
    const endPoint = movingPoints[movingPoints.length - 1];

    for (let i = 1; i < movingPoints.length; i++) {
      totalDistKm += this.calculateHaversineDistanceKm(
        movingPoints[i - 1].latitude,
        movingPoints[i - 1].longitude,
        movingPoints[i].latitude,
        movingPoints[i].longitude
      );
    }

    const durationSeconds = (endPoint.timestamp - startPoint.timestamp) / 1000;
    // Require minimum 12 meters and 3 seconds of genuine movement
    if (totalDistKm < 0.012 || durationSeconds < 3) return '--:--';

    const paceDecimalMinutes = durationSeconds / 60 / totalDistKm;
    // Cap pace between 2:15 /km (world class sprint) and 18:00 /km (gentle walk)
    if (!isFinite(paceDecimalMinutes) || paceDecimalMinutes > 18 || paceDecimalMinutes < 2.25) {
      return '--:--';
    }

    let mins = Math.floor(paceDecimalMinutes);
    let secs = Math.round((paceDecimalMinutes - mins) * 60);
    if (secs >= 60) {
      mins += 1;
      secs = 0;
    }
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  },

  // Calculate overall average pace from distance & duration
  calculateOverallPace(distanceKm: number, durationSeconds: number): string {
    if (distanceKm < 0.03 || durationSeconds < 4) return '--:--';
    const paceDecimal = durationSeconds / 60 / distanceKm;
    if (!isFinite(paceDecimal) || paceDecimal > 20 || paceDecimal < 2.25) return '--:--';
    let mins = Math.floor(paceDecimal);
    let secs = Math.round((paceDecimal - mins) * 60);
    if (secs >= 60) {
      mins += 1;
      secs = 0;
    }
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  },

  // Format distance for UI (meters for < 1km, kilometers for >= 1km)
  formatDistance(distanceKm: number): { value: string; unit: string; displayString: string } {
    if (distanceKm < 1.0) {
      const meters = Math.round(distanceKm * 1000);
      return {
        value: `${meters}`,
        unit: 'm',
        displayString: `${meters} m`,
      };
    }
    const km = distanceKm.toFixed(2);
    return {
      value: km,
      unit: 'km',
      displayString: `${km} km`,
    };
  },

  // Estimate calories burned (~62 kcal per km for average runner)
  estimateCalories(distanceKm: number): number {
    return Math.round(distanceKm * 62);
  },
};
