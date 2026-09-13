export interface RunPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
  speed: number | null; // m/s
  altitude: number | null;
  heading?: number | null;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
  timestamp?: number;
  altitude?: number | null;
}

export interface RunSessionRecord {
  id?: string;
  userId: string;
  title: string;
  type: 'SOLO' | 'CREW' | 'INTERVAL';
  distanceKm: number;
  durationSeconds: number;
  pace: string; // e.g. "4:45 /km"
  avgSpeedKmH?: number;
  maxSpeedKmH?: number;
  calories?: number;
  route?: RouteCoordinate[];
  startLocation?: RouteCoordinate;
  endLocation?: RouteCoordinate;
  createdAt: string;
  dateLabel?: string;
}
