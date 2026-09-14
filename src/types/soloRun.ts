export type RunState =
  | 'IDLE'
  | 'PREPARING'
  | 'GPS_SEARCHING'
  | 'GPS_READY'
  | 'COUNTDOWN'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETING'
  | 'SAVING'
  | 'SAVED'
  | 'SYNC_PENDING'
  | 'ERROR';

export interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  speed: number | null; // in m/s
  heading: number | null;
  altitude: number | null;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface SoloRunMetrics {
  distanceKm: number;
  durationSeconds: number;
  currentPace: string; // e.g. "4:36 /km" or "--:--"
  avgPace: string;
  currentSpeedKmH: number | null;
  avgSpeedKmH: number | null;
  maxSpeedKmH: number | null;
  gpsAccuracy: number | null;
  gpsStatus: 'SEARCHING' | 'READY' | 'GOOD' | 'POOR' | 'LOST' | 'DISABLED';
  trackingIntegrityScore: number; // 0 to 100%
  stage1Ready: boolean; // Fast initial location ready (< 1.5s)
  stage2Ready: boolean; // High-accuracy location ready
  trackingReady: boolean; // High-accuracy tracking anchor established
  firstLocationLatencyMs: number | null;
  trackingReadyLatencyMs: number | null;
}

export interface TrackingPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  bearing: number | null;
  timestamp: number;
}

export interface TrackingSession {
  status:
    | 'IDLE'
    | 'STARTING'
    | 'ACTIVE'
    | 'PAUSED'
    | 'COMPLETING'
    | 'SAVED'
    | 'ERROR';
  points: TrackingPoint[];
  distanceMeters: number;
  startedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
}

export type OfflineRouteMode = 'LOOP' | 'STRAIGHT';
export type RunSubtype = 'SOLO' | 'DUO' | 'GROUP' | 'OFFLINE';

export interface OfflineTargetConfig {
  isOfflineMode: boolean;
  targetDistanceKm: number;
  routeMode: OfflineRouteMode;
}

export interface PendingRun {
  localId: string;
  userId: string;
  title: string;
  type: 'SOLO' | 'CREW';
  subtype?: RunSubtype;
  partnerNames?: string[];
  distanceKm: number;
  durationSeconds: number;
  pace: string;
  avgSpeedKmH?: number;
  maxSpeedKmH?: number;
  createdAt: string;
  plannedRoute?: LatLng[];
  actualRoute?: LatLng[];
  trackingIntegrityScore?: number;
  syncStatus: 'SYNC_PENDING' | 'SYNCED' | 'FAILED';
  offlineConfig?: OfflineTargetConfig;
}
