import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HoneycombPattern } from './HoneycombPattern';
import { useTheme } from '../theme/colors';

interface WeeklyMomentumCardProps {
  distance?: number | string;
  onStartRunPress?: () => void;
  onDuoRunPress?: () => void;
  onGroupRunPress?: () => void;
}

export const WeeklyMomentumCard: React.FC<WeeklyMomentumCardProps> = ({
  distance = '0.1',
  onStartRunPress,
  onDuoRunPress,
  onGroupRunPress,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
      {/* Background Left & Right Edge Honeycomb Texture Pattern */}
      <HoneycombPattern edgeWidth={75} opacity={0.12} />

      {/* Card Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.badgeText}>WEEKLY MOMENTUM</Text>

        {/* Big Distance Stat */}
        <Text style={styles.distanceValue}>{distance}</Text>

        {/* Unit */}
        <Text style={styles.unitText}>KILOMETERS</Text>

        {/* Progress Track with Marker & Finish Flag */}
        <View style={styles.progressContainer}>
          {/* Active distance label above thumb */}
          <View style={styles.markerContainer}>
            <Text style={styles.markerText}>{distance}</Text>
            <View style={styles.markerThumb} />
          </View>

          {/* Dotted Track Line */}
          <View style={styles.trackLineContainer}>
            <View style={styles.dashedTrack} />
          </View>

          {/* Finish Flag */}
          <View style={styles.flagContainer}>
            <Ionicons name="flag" size={15} color="#000000" />
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionButtonsWrapper}>
          {/* Start Solo Run Primary Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onStartRunPress}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={15} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>START SOLO RUN</Text>
          </TouchableOpacity>

          {/* Sub Row: Duo Run & Group Run */}
          <View style={styles.subActionRow}>
            <TouchableOpacity
              style={styles.subActionButton}
              onPress={onDuoRunPress}
              activeOpacity={0.85}
            >
              <Ionicons name="people" size={14} color={colors.primary} />
              <Text style={[styles.subActionButtonText, { color: colors.primary }]}>DUO RUN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subActionButton}
              onPress={onGroupRunPress}
              activeOpacity={0.85}
            >
              <Ionicons name="globe-outline" size={14} color={colors.primary} />
              <Text style={[styles.subActionButtonText, { color: colors.primary }]}>GROUP RUN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#121212',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  distanceValue: {
    fontSize: 66,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: '#000000',
    lineHeight: 72,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#121212',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    marginBottom: 20,
    position: 'relative',
  },
  markerContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  markerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 3,
  },
  markerThumb: {
    width: 18,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  trackLineContainer: {
    flex: 1,
    height: 7,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  dashedTrack: {
    height: 2,
    borderWidth: 1.5,
    borderColor: '#111111',
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  flagContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -1,
  },
  actionButtonsWrapper: {
    width: '100%',
    gap: 8,
  },
  actionButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#050505',
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subActionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  subActionButton: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(5, 5, 5, 0.88)',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(30, 30, 30, 0.8)',
  },
  subActionButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
