import { GPSPoint, LatLng } from '../../types/soloRun';
import { MAP_CONFIG } from '../../config/map';

const EARTH_RADIUS_KM = 6371.0088;

export interface GPSValidationResult {
  isValid: boolean;
  reason?: 'INVALID_COORDINATES' | 'LOW_ACCURACY' | 'STALE' | 'DUPLICATE' | 'IMPOSSIBLE_SPEED' | 'GPS_JUMP';
}

export type GPSAccuracyTier = 'HIGH' | 'GOOD' | 'WEAK' | 'UNUSABLE';

export const runTrackingService = {
  // Haversine geospatial calculation between two lat/lng coordinates
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
    if (accuracy <= 25) return 'GOOD';
    return 'WEAK';
  },

  // Comprehensive GPS Validation against spikes, jitter, and bad accuracy
  validateGPSPoint(point: GPSPoint, lastPoint?: GPSPoint | null): GPSValidationResult {
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

    // 3. Accuracy Threshold
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

      const calculatedSpeedMs = (segmentKm * 1000) / timeDiffSeconds;

      // Reject movement faster than 12 m/s (~43.2 km/h)
      if (
        calculatedSpeedMs > MAP_CONFIG.locationSettings.maxReasonableSpeedMs ||
        (point.speed !== null && point.speed > MAP_CONFIG.locationSettings.maxReasonableSpeedMs)
      ) {
        return {
          isValid: false,
          reason: calculatedSpeedMs > 30 ? 'GPS_JUMP' : 'IMPOSSIBLE_SPEED',
        };
      }
    }

    return { isValid: true };
  },

  // Rolling window smoothed pace string in "M:SS /km"
  calculateRollingPaceString(recentPoints: GPSPoint[]): string {
    if (recentPoints.length < 2) return '--:--';

    let totalDistKm = 0;
    const startPoint = recentPoints[0];
    const endPoint = recentPoints[recentPoints.length - 1];

    for (let i = 1; i < recentPoints.length; i++) {
      totalDistKm += this.calculateHaversineDistanceKm(
        recentPoints[i - 1].latitude,
        recentPoints[i - 1].longitude,
        recentPoints[i].latitude,
        recentPoints[i].longitude
      );
    }

    const durationSeconds = (endPoint.timestamp - startPoint.timestamp) / 1000;
    if (totalDistKm < 0.02 || durationSeconds < 3) return '--:--';

    const paceDecimalMinutes = durationSeconds / 60 / totalDistKm;
    if (!isFinite(paceDecimalMinutes) || paceDecimalMinutes > 30 || paceDecimalMinutes < 2) {
      return '--:--';
    }

    const mins = Math.floor(paceDecimalMinutes);
    const secs = Math.round((paceDecimalMinutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  },

  // Calculate overall average pace from distance & duration
  calculateOverallPace(distanceKm: number, durationSeconds: number): string {
    if (distanceKm < 0.05 || durationSeconds < 3) return '--:--';
    const paceDecimal = durationSeconds / 60 / distanceKm;
    if (!isFinite(paceDecimal) || paceDecimal > 30 || paceDecimal < 2) return '--:--';
    const mins = Math.floor(paceDecimal);
    const secs = Math.round((paceDecimal - mins) * 60);
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

  // Estimate calories burned (~60 kcal per km for average runner)
  estimateCalories(distanceKm: number): number {
    return Math.round(distanceKm * 62);
  },
};
