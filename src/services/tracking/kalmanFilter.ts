import { GPSPoint } from '../../types/soloRun';

/**
 * 2D GPS Kalman Filter for real-time runner position smoothing.
 * Filters out raw sensor noise, multipath GPS bounce, and micro-jitter.
 */
export class GPSKalmanFilter {
  private lat: number | null = null;
  private lng: number | null = null;
  private varianceLat: number = -1;
  private varianceLng: number = -1;
  private lastTimestamp: number = 0;

  // Process noise (how fast a runner can realistically accelerate / change position per second)
  // For running (~3 m/s), ~3.0 meters per second variance is optimal.
  // In degrees: (3.0 / 111320)^2 ~= 7.26e-10
  private readonly processNoisePerSecond: number;

  constructor(processNoiseMetersPerSecond = 3.0) {
    const degPerSec = processNoiseMetersPerSecond / 111320;
    this.processNoisePerSecond = degPerSec * degPerSec;
  }

  /**
   * Reset filter state (e.g. on run start, resume from pause, or after a large signal gap)
   */
  public reset(): void {
    this.lat = null;
    this.lng = null;
    this.varianceLat = -1;
    this.varianceLng = -1;
    this.lastTimestamp = 0;
  }

  /**
   * Filter an incoming raw GPS point.
   * Returns a smoothed GPSPoint with stabilized latitude, longitude, and accuracy.
   */
  public filter(rawPoint: GPSPoint): GPSPoint {
    // Guard against corrupt/NaN/zero coordinates poisoning filter state
    if (
      !rawPoint ||
      isNaN(rawPoint.latitude) ||
      isNaN(rawPoint.longitude) ||
      (rawPoint.latitude === 0 && rawPoint.longitude === 0) ||
      rawPoint.latitude < -90 ||
      rawPoint.latitude > 90 ||
      rawPoint.longitude < -180 ||
      rawPoint.longitude > 180
    ) {
      return rawPoint;
    }

    const accuracy = rawPoint.accuracy ?? 15;
    const timestamp = rawPoint.timestamp || Date.now();

    // Convert accuracy in meters to degree variance
    // 1 deg lat ~= 111,320m; 1 deg lng ~= 111,320m * cos(lat)
    const latRad = (rawPoint.latitude * Math.PI) / 180;
    const metersPerDegLat = 111320;
    const metersPerDegLng = Math.max(1000, 111320 * Math.cos(latRad));

    const accuracyDegLat = Math.max(accuracy, 2) / metersPerDegLat;
    const accuracyDegLng = Math.max(accuracy, 2) / metersPerDegLng;
    const measurementVarianceLat = accuracyDegLat * accuracyDegLat;
    const measurementVarianceLng = accuracyDegLng * accuracyDegLng;

    const rawDeltaSeconds = (timestamp - this.lastTimestamp) / 1000;

    // First point or re-initialization after reset / prolonged signal gap (> 6s)
    if (
      this.lat === null ||
      this.lng === null ||
      this.lastTimestamp === 0 ||
      rawDeltaSeconds > 6
    ) {
      this.lat = rawPoint.latitude;
      this.lng = rawPoint.longitude;
      this.varianceLat = measurementVarianceLat;
      this.varianceLng = measurementVarianceLng;
      this.lastTimestamp = timestamp;

      return {
        ...rawPoint,
        latitude: this.lat,
        longitude: this.lng,
      };
    }

    const deltaSeconds = Math.max(0.1, Math.min(6, rawDeltaSeconds));
    this.lastTimestamp = timestamp;

    // 1. Predict Step: Increase variance by process noise over elapsed time
    this.varianceLat += this.processNoisePerSecond * deltaSeconds;
    this.varianceLng += this.processNoisePerSecond * deltaSeconds;

    // 2. Update Step: Compute Kalman Gain K = P / (P + R)
    const kLat = this.varianceLat / (this.varianceLat + measurementVarianceLat);
    const kLng = this.varianceLng / (this.varianceLng + measurementVarianceLng);

    // Apply weighted correction
    this.lat = this.lat + kLat * (rawPoint.latitude - this.lat);
    this.lng = this.lng + kLng * (rawPoint.longitude - this.lng);

    // Update error covariance: P = (1 - K) * P
    this.varianceLat = (1 - kLat) * this.varianceLat;
    this.varianceLng = (1 - kLng) * this.varianceLng;

    // Estimated smoothed accuracy in meters
    const smoothedAccuracyMeters = Math.max(
      3,
      Math.min(accuracy, Math.sqrt(this.varianceLat) * metersPerDegLat)
    );

    return {
      ...rawPoint,
      latitude: Number(this.lat.toFixed(7)),
      longitude: Number(this.lng.toFixed(7)),
      accuracy: Math.round(smoothedAccuracyMeters * 10) / 10,
    };
  }
}

export const gpsKalmanFilter = new GPSKalmanFilter(3.5);
