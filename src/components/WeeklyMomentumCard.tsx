import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HoneycombPattern } from './HoneycombPattern';
import { colors } from '../theme/colors';

interface WeeklyMomentumCardProps {
  distance?: number | string;
  onStartRunPress?: () => void;
}

export const WeeklyMomentumCard: React.FC<WeeklyMomentumCardProps> = ({
  distance = '0.1',
  onStartRunPress,
}) => {
  return (
    <View style={styles.cardContainer}>
      {/* Background Left & Right Edge Honeycomb Texture Pattern */}
      <HoneycombPattern edgeWidth={75} opacity={0.35} />

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

        {/* Start Solo Run Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onStartRunPress}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>START SOLO RUN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    backgroundColor: colors.limePrimary,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.limePrimary,
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
  actionButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#050505',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  actionButtonText: {
    color: colors.limePrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
