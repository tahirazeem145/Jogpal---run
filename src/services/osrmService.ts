import { LatLng } from '../types/soloRun';
import { MAP_CONFIG } from '../config/map';

export interface OSRMRouteResult {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
}

const REQUEST_TIMEOUT_MS = 6000; // 6s timeout for spotty mobile connections
const routeCache = new Map<string, { data: OSRMRouteResult; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute in-memory cache

/**
 * Validate that a coordinate is physically real and not corrupted
 */
function isValidCoord(pt: LatLng | null | undefined): boolean {
  if (!pt) return false;
  if (typeof pt.latitude !== 'number' || typeof pt.longitude !== 'number') return false;
  if (isNaN(pt.latitude) || isNaN(pt.longitude)) return false;
  if (pt.latitude === 0 && pt.longitude === 0) return false;
  return pt.latitude >= -90 && pt.latitude <= 90 && pt.longitude >= -180 && pt.longitude <= 180;
}

export const osrmService = {
  /**
   * Request a pedestrian / foot route through a series of waypoints via OSRM.
   * Hardened for mobile devices with timeouts, user-agent, and input validation.
   */
  async getFootRoute(waypoints: LatLng[]): Promise<OSRMRouteResult | null> {
    const validWaypoints = (waypoints || []).filter(isValidCoord);
    if (validWaypoints.length < 2) return null;

    const cacheKey = validWaypoints
      .map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`)
      .join(';');

    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const coordString = validWaypoints
        .map((pt) => `${pt.longitude.toFixed(6)},${pt.latitude.toFixed(6)}`)
        .join(';');

      const url = `${MAP_CONFIG.osrmApiURL}/route/v1/foot/${coordString}?overview=full&geometries=geojson&steps=false`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'JogpalApp/1.0 (Mobile; Android/iOS/Web)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[OSRM_MOBILE] Routing server responded with HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        return null;
      }

      const route = data.routes[0];
      const geojsonCoords: [number, number][] = route.geometry?.coordinates || [];

      // GeoJSON coordinates are [longitude, latitude]
      const coordinates: LatLng[] = geojsonCoords
        .map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        .filter(isValidCoord);

      if (coordinates.length === 0) return null;

      const result: OSRMRouteResult = {
        coordinates,
        distanceMeters: route.distance || 0,
        durationSeconds: route.duration || 0,
      };

      routeCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        console.warn('[OSRM_MOBILE] Route request timed out on mobile connection (6s), using fallback');
      } else {
        console.warn('[OSRM_MOBILE] Routing request failed, using fallback:', error?.message || error);
      }
      return null;
    }
  },

  /**
   * Generate an authentic street circuit matching a target distance around a center point.
   * Generates pedestrian loop waypoints and calculates road-snapped OSRM geometry.
   * Always resilient on mobile: returns clean geometric fallback if network is offline.
   */
  async generateCircuitRoute(
    center: LatLng,
    targetDistanceKm: number,
    routeMode: 'LOOP' | 'STRAIGHT' = 'LOOP'
  ): Promise<LatLng[]> {
    if (!isValidCoord(center)) return [];

    const effectiveTargetKm = Math.max(0.5, Math.min(42, targetDistanceKm || 3));

    if (routeMode === 'STRAIGHT') {
      // 1 deg latitude is approx 111km
      const deltaLat = (effectiveTargetKm / 111) * 0.95;
      const endPoint: LatLng = {
        latitude: center.latitude + deltaLat,
        longitude: center.longitude,
      };

      const osrmResult = await this.getFootRoute([center, endPoint]);
      if (osrmResult && osrmResult.coordinates.length > 1) {
        return osrmResult.coordinates;
      }

      return [center, endPoint];
    }

    // LOOP Mode: Approximate radius in degrees for target circuit circumference
    // Circumference = 2 * PI * R => R ≈ targetDistanceKm / (2 * PI)
    const radiusKm = Math.max(0.25, effectiveTargetKm / (2 * Math.PI));
    const radiusDegLat = radiusKm / 111;
    const cosLat = Math.cos((center.latitude * Math.PI) / 180);
    const radiusDegLng = radiusKm / (111 * (Math.abs(cosLat) > 0.01 ? cosLat : 1));

    // Generate 4 cardinal waypoints for smooth loop (North, East, South, West, back to North/Start)
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const waypoints: LatLng[] = angles.map((angle) => ({
      latitude: center.latitude + radiusDegLat * Math.cos(angle),
      longitude: center.longitude + radiusDegLng * Math.sin(angle),
    }));
    // Close the loop back to first waypoint
    waypoints.push(waypoints[0]);

    const osrmResult = await this.getFootRoute(waypoints);
    if (osrmResult && osrmResult.coordinates.length > 3) {
      return osrmResult.coordinates;
    }

    // Fallback: return smoothly interpolated geometric loop so map always displays a guide line
    const denseFallback: LatLng[] = [];
    for (let i = 0; i <= 16; i++) {
      const theta = (i / 16) * 2 * Math.PI;
      denseFallback.push({
        latitude: center.latitude + radiusDegLat * Math.cos(theta),
        longitude: center.longitude + radiusDegLng * Math.sin(theta),
      });
    }
    return denseFallback;
  },

  /**
   * Snap raw GPS points to the nearest pedestrian street network via OSRM Match API
   */
  async matchGPSRoute(rawPoints: LatLng[]): Promise<LatLng[]> {
    const valid = (rawPoints || []).filter(isValidCoord);
    if (valid.length < 3) return valid;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // OSRM Match supports up to 100 coordinates per request; sample if necessary
      const step = Math.max(1, Math.floor(valid.length / 80));
      const sampled = valid.filter((_, idx) => idx % step === 0 || idx === valid.length - 1);

      const coordString = sampled
        .map((pt) => `${pt.longitude.toFixed(6)},${pt.latitude.toFixed(6)}`)
        .join(';');

      const url = `${MAP_CONFIG.osrmApiURL}/match/v1/foot/${coordString}?overview=full&geometries=geojson`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'JogpalApp/1.0 (Mobile; Android/iOS/Web)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return valid;

      const data = await response.json();
      if (!data || data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) {
        return valid;
      }

      const matchedCoords: [number, number][] = data.matchings[0].geometry?.coordinates || [];
      if (matchedCoords.length === 0) return valid;

      return matchedCoords
        .map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        .filter(isValidCoord);
    } catch (e) {
      clearTimeout(timeoutId);
      return valid;
    }
  },
};
