export type ThemeMode = 'default' | 'orange';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  cardSubtle: string;

  // Primary Brand Accent
  primary: string;
  primaryBright: string;
  primaryDark: string;
  primaryMuted: string;
  primaryBadge: string;
  primaryLight: string;
  glow: string;
  accentSubtle: string;

  // Backwards-compatible aliases for limePrimary, limeBright, etc.
  limePrimary: string;
  limeBright: string;
  limeDark: string;
  limeMuted: string;
  limeBadge: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDark: string;

  // UI Element Colors
  avatarBg: string;
  avatarBorder: string;
  crewAddBg: string;
  crewAddBorder: string;

  // Chart Colors
  chartRed: string;
  chartBg: string;

  // Tab Bar
  tabBarBg: string;
  tabBarBorder: string;
  tabInactive: string;
  tabActive: string;
}

export const defaultTheme: ThemeColors = {
  background: '#000000',
  surface: '#111111',
  card: '#161616',
  cardBorder: '#262626',
  cardSubtle: '#1C1C1E',

  // Brand Neon Lime
  primary: '#CCFF00',
  primaryBright: '#D4FF00',
  primaryDark: '#B8E600',
  primaryMuted: '#243305',
  primaryBadge: '#9AE600',
  primaryLight: 'rgba(204, 255, 0, 0.15)',
  glow: 'rgba(204, 255, 0, 0.4)',
  accentSubtle: '#18240D',

  // Aliases
  limePrimary: '#CCFF00',
  limeBright: '#D4FF00',
  limeDark: '#B8E600',
  limeMuted: '#243305',
  limeBadge: '#9AE600',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#636366',
  textDark: '#050505',

  // UI Element Colors
  avatarBg: '#222222',
  avatarBorder: '#333333',
  crewAddBg: '#18240D',
  crewAddBorder: '#5E8216',

  // Chart Colors
  chartRed: '#FF453A',
  chartBg: '#231B1E',

  // Tab Bar
  tabBarBg: '#050505',
  tabBarBorder: '#1A1A1A',
  tabInactive: '#6E6E73',
  tabActive: '#CCFF00',
};

// Claude Brand Terracotta / Burnt Orange Theme Palette
export const orangeTheme: ThemeColors = {
  background: '#0D0C0B',
  surface: '#171412',
  card: '#1F1A17',
  cardBorder: '#332B26',
  cardSubtle: '#29221D',

  // Claude Terracotta Orange
  primary: '#D97757',
  primaryBright: '#E88665',
  primaryDark: '#BA5D3E',
  primaryMuted: '#381C14',
  primaryBadge: '#E27D60',
  primaryLight: 'rgba(217, 119, 87, 0.18)',
  glow: 'rgba(217, 119, 87, 0.4)',
  accentSubtle: '#2A1711',

  // Aliases (mapped to orange so any component reading limePrimary gets Claude orange)
  limePrimary: '#D97757',
  limeBright: '#E88665',
  limeDark: '#BA5D3E',
  limeMuted: '#381C14',
  limeBadge: '#E27D60',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A89E97',
  textMuted: '#7D726B',
  textDark: '#0A0908',

  // UI Element Colors
  avatarBg: '#26201C',
  avatarBorder: '#3D332D',
  crewAddBg: '#2A1711',
  crewAddBorder: '#8C432D',

  // Chart Colors
  chartRed: '#FF5E4D',
  chartBg: '#281B18',

  // Tab Bar
  tabBarBg: '#0D0C0B',
  tabBarBorder: '#241F1C',
  tabInactive: '#7D726B',
  tabActive: '#D97757',
};

export const themes: Record<ThemeMode, ThemeColors> = {
  default: defaultTheme,
  orange: orangeTheme,
};

// Default export for static/legacy usages
export const colors = defaultTheme;
