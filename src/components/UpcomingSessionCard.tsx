import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MiniTelemetryChart } from './MiniTelemetryChart';
import { UpcomingSession } from '../types/data';
import { colors } from '../theme/colors';

interface UpcomingSessionCardProps {
  session?: UpcomingSession | null;
  onPress?: () => void;
  onSchedulePress?: () => void;
}

export const UpcomingSessionCard: React.FC<UpcomingSessionCardProps> = ({
  session,
  onPress,
  onSchedulePress,
}) => {
  if (!session) {
    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onSchedulePress || onPress}
        activeOpacity={0.85}
      >
        <View style={styles.tagRow}>
          <View style={styles.calendarIconContainer}>
            <Text style={styles.calendarEmoji}>📅</Text>
          </View>
          <Text style={styles.tagText}>UPCOMING SESSION</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.textContainer}>
            <Text style={styles.sessionTitleText}>No upcoming session scheduled</Text>
            <Text style={styles.sessionMetaText}>Tap to plan your next route</Text>
          </View>
          <MiniTelemetryChart />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header Tag */}
      <View style={styles.tagRow}>
        <View style={styles.calendarIconContainer}>
          <Text style={styles.calendarEmoji}>📅</Text>
        </View>
        <Text style={styles.tagText}>UPCOMING SESSION</Text>
      </View>

      {/* Main Details and Mini Chart */}
      <View style={styles.detailsRow}>
        <View style={styles.textContainer}>
          <Text style={styles.sessionTitleText}>
            SESSION: <Text style={styles.sessionNameText}>{session.title}</Text>
          </Text>
          <Text style={styles.sessionMetaText}>
            {session.scheduledAt} • {session.distanceKm}
          </Text>
        </View>

        {/* Telemetry Chart Badge */}
        <MiniTelemetryChart />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    backgroundColor: '#151517',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#242428',
    marginBottom: 24,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  calendarIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarEmoji: {
    fontSize: 14,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.limePrimary,
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  sessionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sessionNameText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sessionMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 6,
  },
});
