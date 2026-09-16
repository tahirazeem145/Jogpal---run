import { StyleProp, ViewStyle } from 'react-native';
import { GPSPoint, LatLng } from './soloRun';

export type JogpalCoordinate = [number, number]; // [longitude, latitude] in GeoJSON standard

export type CameraMode = 'FOLLOWING' | 'USER_CONTROLLED';

export interface PartnerRunner {
  id: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  pace?: string;
}

export interface JogpalMapProps {
  currentLocation?: GPSPoint | null;
  actualRoute: LatLng[];
  plannedRoute?: LatLng[];
  ghostRoute?: LatLng[];
  ghostLocation?: LatLng | null;
  ghostLabel?: string;
  partnerRunners?: PartnerRunner[];
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  isFullScreen?: boolean;
  showRecenterButton?: boolean;
  showStartFinishMarkers?: boolean;
  fitRouteOnLoad?: boolean;
  onMapLoaded?: () => void;
  onMapError?: (error: any) => void;
}
