export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  level: number;
  streakDays: number;
  totalDistanceKm: number;
  totalJogs: number;
  recordsCount: number;
  passportUnlockedCount: number;
  passportTotalCount: number;
  locationSharing: boolean;
  runningPreferences?: string;
  sharingStatus?: string;
  rank?: string;
}

export interface RunSession {
  id: string;
  userId: string;
  title: string;
  type: 'SOLO' | 'CREW' | 'INTERVAL';
  distanceKm: number;
  durationSeconds: number; // e.g. 540 seconds = 09:00
  pace: string; // e.g. "4:30 /km" or "--:--"
  avgBpm?: number;
  calories?: number;
  avgSpeedKmH?: number;
  maxSpeedKmH?: number;
  route?: { latitude: number; longitude: number; timestamp?: number }[];
  startLocation?: { latitude: number; longitude: number };
  endLocation?: { latitude: number; longitude: number };
  createdAt: string; // ISO string
  dateLabel?: string; // e.g. "TODAY", "YESTERDAY", "AUG 31, 2026"
}

export interface UpcomingSession {
  id: string;
  title: string;
  scheduledAt: string; // e.g. "2026-08-25 @ 07:00"
  distanceKm: string; // e.g. "11.52 KM"
  sessionType?: string;
}

export interface CrewMember {
  id: string;
  userId?: string;
  name: string;
  initial: string;
  email?: string;
  level?: number;
  totalDistanceKm?: number;
  streakDays?: number;
  rank?: string;
  avatarUrl?: string;
  photoURL?: string;
  status?: string;
  isOnline?: boolean;
}

export interface PersonalBest {
  id: string;
  category: string;
  record: string;
  pace?: string;
  date?: string;
  unlocked?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'ALL' | 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  unlocked: boolean;
}

export interface CrewRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail?: string;
  fromUserAvatar?: string;
  fromUserLevel?: number;
  toUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string; // ISO string
  type: 'CREW_INVITE' | 'RUN_INVITE';
  sessionId?: string;
}

export interface DuoParticipantTelemetry {
  userId: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  pace: string;
  speedKmH: number;
  runState?: 'PREPARING' | 'GPS_READY' | 'COUNTDOWN' | 'ACTIVE' | 'PAUSED' | 'FINISHED';
  updatedAt: string;
}

export interface DuoRunSession {
  id: string;
  hostUserId: string;
  hostName: string;
  hostAvatar?: string;
  guestUserId: string;
  guestName: string;
  guestAvatar?: string;
  status: 'INVITED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  participants?: {
    [userId: string]: DuoParticipantTelemetry;
  };
}

export interface GroupParticipantTelemetry {
  userId: string;
  name: string;
  avatarUrl?: string;
  initial?: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  pace: string;
  speedKmH: number;
  runState?: 'PREPARING' | 'GPS_READY' | 'COUNTDOWN' | 'ACTIVE' | 'PAUSED' | 'FINISHED';
  status?: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'RUNNING' | string;
  updatedAt: string;
}

export interface GroupInvitedFriend {
  userId: string;
  name: string;
  avatarUrl?: string;
  initial?: string;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
}

export interface GroupRunSession {
  id: string;
  hostUserId: string;
  hostName: string;
  hostAvatar?: string;
  title?: string;
  invitedUserIds: string[];
  invitedFriends: {
    [userId: string]: GroupInvitedFriend;
  };
  status: 'INVITED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  participants?: {
    [userId: string]: GroupParticipantTelemetry;
  };
}
