export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface SOSLocationPayload {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface SOSSettings {
  contacts: EmergencyContact[];
  nationalEmergencyNumber: string; // e.g. "112" or "911"
  enableStrobeBeacon: boolean;
  enableVibrationPattern: boolean;
  countdownSeconds: number; // default 3s
}

export interface SOSAlertEvent {
  id: string;
  runnerName: string;
  runnerId?: string;
  location: SOSLocationPayload;
  mapsUrl: string;
  triggeredAt: string;
  sessionId?: string;
  runMode?: string;
}
