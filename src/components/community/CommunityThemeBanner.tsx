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
  const isCompact = height <= 135;

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
      <View style={[styles.bannerContent, isCompact && styles.bannerContentCompact]}>
        {/* Top Badge Row */}
        <View style={styles.topBadgeRow}>
          {categoryName ? (
            <View
              style={[
                styles.categoryBadge,
                isCompact && styles.categoryBadgeCompact,
                { backgroundColor: 'rgba(0, 0, 0, 0.65)', borderColor: theme.primaryColor },
              ]}
            >
              <Ionicons name="sparkles" size={isCompact ? 10 : 12} color={theme.primaryColor} />
              <Text
                style={[
                  styles.categoryText,
                  isCompact && styles.categoryTextCompact,
                  { color: theme.primaryColor },
                ]}
                numberOfLines={1}
              >
                {categoryName.replace('_', ' ')}
              </Text>
            </View>
          ) : <View />}

          {membersCount !== undefined ? (
            <View style={[styles.membersBadge, isCompact && styles.membersBadgeCompact]}>
              <Feather name="users" size={isCompact ? 10 : 12} color="#FFFFFF" />
              <Text style={[styles.membersText, isCompact && styles.membersTextCompact]}>
                {membersCount} {isCompact ? 'R' : 'RUNNERS'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Section: Title, Tagline & Location */}
        <View style={styles.bottomSection}>
          <Text
            style={[
              styles.titleText,
              isCompact && styles.titleTextCompact,
              { color: theme.textColor },
            ]}
            numberOfLines={isCompact ? 1 : 2}
          >
            {title}
          </Text>

          {!isCompact && tagline ? (
            <Text style={styles.taglineText} numberOfLines={1}>
              {tagline}
            </Text>
          ) : null}

          {location ? (
            <View style={[styles.locationRow, isCompact && styles.locationRowCompact]}>
              <Ionicons name="location-outline" size={isCompact ? 11 : 13} color={theme.accentColor} />
              <Text
                style={[
                  styles.locationText,
                  isCompact && styles.locationTextCompact,
                  { color: theme.accentColor },
                ]}
                numberOfLines={1}
              >
                {location}
              </Text>
            </View>
          ) : null}
        </View>
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
    top: 12,
    right: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cyberBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  bannerContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  bannerContentCompact: {
    padding: 10,
  },
  topBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    maxWidth: '65%',
  },
  categoryBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  categoryTextCompact: {
    fontSize: 8,
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  membersBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  membersText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  membersTextCompact: {
    fontSize: 8,
  },
  bottomSection: {
    gap: 2,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 22,
  },
  titleTextCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationRowCompact: {
    marginTop: 1,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locationTextCompact: {
    fontSize: 9.5,
  },
});
