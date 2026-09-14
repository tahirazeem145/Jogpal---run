import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CoverThemeId } from '../../types/community';
import { COVER_THEMES } from '../../services/communityService';

interface CommunityThemeBannerProps {
  themeId: CoverThemeId;
  title: string;
  tagline?: string;
  categoryName?: string;
  location?: string;
  membersCount?: number;
  imageUrl?: string;
  style?: ViewStyle;
  height?: number;
}

export const CommunityThemeBanner: React.FC<CommunityThemeBannerProps> = ({
  themeId,
  title,
  tagline,
  categoryName,
  location,
  membersCount,
  imageUrl,
  style,
  height = 160,
}) => {
  const theme = COVER_THEMES[themeId] || COVER_THEMES.CYBER_NEON;

  return (
    <View style={[styles.container, { height }, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}

      {/* Cyber Gradient Overlay */}
      <LinearGradient
        colors={theme.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Grid Pattern Decorative Elements */}
      <View style={styles.cyberGridOverlay}>
        <View style={[styles.glowingDot, { backgroundColor: theme.accentColor }]} />
        <View style={[styles.cyberBar, { backgroundColor: theme.primaryColor }]} />
      </View>

      {/* Banner Content */}
      <View style={styles.bannerContent}>
        {/* Top Badge Row */}
        <View style={styles.topBadgeRow}>
          {categoryName ? (
            <View style={[styles.categoryBadge, { backgroundColor: 'rgba(0, 0, 0, 0.6)', borderColor: theme.primaryColor }]}>
              <Ionicons name="sparkles" size={12} color={theme.primaryColor} />
              <Text style={[styles.categoryText, { color: theme.primaryColor }]}>
                {categoryName.replace('_', ' ')}
              </Text>
            </View>
          ) : null}

          {membersCount !== undefined ? (
            <View style={styles.membersBadge}>
              <Feather name="users" size={12} color="#FFFFFF" />
              <Text style={styles.membersText}>{membersCount} RUNNERS</Text>
            </View>
          ) : null}
        </View>

        {/* Title & Tagline */}
        <View style={styles.titleWrapper}>
          <Text style={[styles.titleText, { color: theme.textColor }]} numberOfLines={2}>
            {title}
          </Text>
          {tagline ? (
            <Text style={styles.taglineText} numberOfLines={1}>
              {tagline}
            </Text>
          ) : null}
        </View>

        {/* Location Row */}
        {location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={theme.accentColor} />
            <Text style={[styles.locationText, { color: theme.accentColor }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cyberGridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
  },
  glowingDot: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#00FF88',
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  cyberBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  bannerContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  membersText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  titleWrapper: {
    marginTop: 6,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
