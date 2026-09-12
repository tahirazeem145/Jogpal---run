import { validateGPSPoint, calculateHaversineDistanceKm, calculateRollingPaceString, getAccuracyTier } from '../src/services/locationService';
import { GPSPoint } from '../src/types/soloRun';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST_FAILURE] ${message}`);
  }
}

export function runTrackingQualityTestSuite() {
  console.log('[TEST_SUITE] Starting JOGPAL Tracking Quality Unit Tests...');
  const baseTimestamp = 1700000000000;

  const createPoint = (
    lat: number,
    lng: number,
    accuracy: number = 5,
    timestampOffsetSec: number = 0,
    speed: number | null = 2.5
  ): GPSPoint => ({
    latitude: lat,
    longitude: lng,
    accuracy,
    timestamp: baseTimestamp + timestampOffsetSec * 1000,
    speed,
    heading: 0,
    altitude: 10,
  });

  // 1. First Point Rule
  const p0 = createPoint(37.7749, -122.4194);
  const v0 = validateGPSPoint(p0, null);
  assert(v0.isValid === true, 'First point P0 should be valid');

  // 2. Normal Movement
  const p1 = createPoint(37.7755, -122.4194, 5, 10);
  const v1 = validateGPSPoint(p1, p0);
  assert(v1.isValid === true, 'Normal movement P0 -> P1 should be valid');
  const distKm = calculateHaversineDistanceKm(p0.latitude, p0.longitude, p1.latitude, p1.longitude);
  assert(distKm > 0.05 && distKm < 0.1, 'Distance between P0 and P1 should be ~66m');

  // 3. Duplicate Timestamp
  const pDuplicate = createPoint(37.7750, -122.4194, 5, 0);
  const vDup = validateGPSPoint(pDuplicate, p0);
  assert(vDup.isValid === false && vDup.reason === 'DUPLICATE', 'Duplicate timestamp must be rejected');

  // 4. Invalid Coordinate
  const pInvalidLat = createPoint(95.0, -122.4194);
  assert(validateGPSPoint(pInvalidLat, null).reason === 'INVALID_COORDINATES', 'Latitude > 90 must be rejected');

  // 5. Impossible Speed Spikes (> 12 m/s)
  const pTeleport = createPoint(37.8000, -122.4194, 5, 2);
  const vTeleport = validateGPSPoint(pTeleport, p0);
  assert(vTeleport.isValid === false, 'Teleportation speed spike must be rejected');

  // 6. Stationary GPS Jitter Threshold (< 3m)
  const pJitter = createPoint(37.77490001, -122.4194, 5, 2);
  const jitterDistMeters = calculateHaversineDistanceKm(p0.latitude, p0.longitude, pJitter.latitude, pJitter.longitude) * 1000;
  assert(jitterDistMeters < 3.0, 'Stationary jitter distance should be < 3m');

  // 7 & 8. Pause & Resume Reference Behavior
  const pFirstResumed = createPoint(37.7794, -122.4194, 5, 200);
  const vResumed = validateGPSPoint(pFirstResumed, null);
  assert(vResumed.isValid === true, 'Resumed first point should reset reference');

  // 9. Accuracy Tiers
  assert(getAccuracyTier(5) === 'HIGH', '5m should be HIGH accuracy tier');
  assert(getAccuracyTier(15) === 'GOOD', '15m should be GOOD accuracy tier');
  assert(getAccuracyTier(35) === 'WEAK', '35m should be WEAK accuracy tier');
  assert(getAccuracyTier(60) === 'UNUSABLE', '60m should be UNUSABLE accuracy tier');

  // 10. Rolling Window Pace Calculation
  const points: GPSPoint[] = [
    createPoint(37.7749, -122.4194, 5, 0),
    createPoint(37.7750, -122.4194, 5, 10),
    createPoint(37.7752, -122.4194, 5, 20),
    createPoint(37.7754, -122.4194, 5, 30),
  ];
  const paceStr = calculateRollingPaceString(points);
  assert(/^\d+:\d{2} \/km$/.test(paceStr), 'Rolling pace string should match MM:SS /km format');

  console.log('[TEST_SUITE] All 10 Tracking Quality Unit Tests PASSED cleanly!');
  return true;
}
