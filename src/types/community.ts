export type CoverThemeId =
  | 'CYBER_NEON'
  | 'NEON_SUNSET'
  | 'ELECTRIC_GREEN'
  | 'MIDNIGHT_BLUE'
  | 'SOLAR_GOLD'
  | 'OBSIDIAN_DARK';

export interface CoverTheme {
  id: CoverThemeId;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientColors: [string, string, string];
  textColor: string;
  description: string;
}

export interface WeatherData {
  temp: string; // e.g., "21°C"
  condition: string; // e.g., "Clear & Cool", "Partly Cloudy", "Light Breeze", "Mild Rain"
  icon: string; // e.g., "sun", "cloud-sun", "cloud-rain", "thermometer"
  humidity: string; // e.g., "55%"
  windSpeed: string; // e.g., "11 km/h"
  advice: string; // e.g., "Optimal running conditions! Hydrate and enjoy."
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  date: string; // e.g., "Today @ 18:30"
  location: string;
  distanceKm: string; // e.g., "5.00 KM"
  targetPace: string; // e.g., "5:30 /km"
  description: string;
  weather: WeatherData;
  participantIds: string[];
  createdAt: string;
}

export interface CommunityJoinRequest {
  id: string;
  communityId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userLevel?: number;
  userTotalKm?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  tagline: string;
  category: 'MARATHON' | 'SPEED_SPRINT' | 'CASUAL_JOG' | 'TRAIL_RUN' | 'NIGHT_RUN' | 'FITNESS_SOCIAL';
  description: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  coverTheme: CoverThemeId;
  coverImageUrl?: string;
  location: string;
  mandatoryRules: string[]; // List of mandatory guidelines e.g. ["Running Shoes", "Hydration", "Punctuality"]
  memberPerks: string[]; // What members will see & get e.g. ["Weekly Hosted Runs", "GPX Route Maps", "Live Weather Alerts"]
  isPublic: boolean; // True = instant join, False = request approval required
  membersCount: number;
  memberIds: string[];
  pendingRequestIds: string[];
  events?: CommunityEvent[];
  createdAt: string;
}
