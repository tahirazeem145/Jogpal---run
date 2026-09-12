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
