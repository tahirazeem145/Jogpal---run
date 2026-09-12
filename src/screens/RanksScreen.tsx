import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NeonCard } from '../components/NeonCard';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme/colors';

const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const RanksScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { userProfile, runs } = useApp();
  const { colors } = useTheme();

  const streakDays = userProfile?.streakDays || 0;
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const handleBack = () => {
    Alert.alert('Navigation', 'Back pressed');
  };

  const handleAnalyze = () => {
    Alert.alert('Streak Analysis', `Analyzing ${streakDays} day streak data from Firebase...`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>LEADERBOARD</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Streak Hero Card with Honeycomb Left & Right Badges */}
        <NeonCard style={styles.streakCard} contentStyle={styles.streakContent}>
          {/* Top Row */}
          <View style={styles.streakTopRow}>
            <View style={styles.streakTitleGroup}>
              <View style={styles.streakHeader}>
                <Ionicons name="flame" size={20} color="#000000" />
                <Text style={styles.streakTitleText}>{streakDays} DAY STREAK</Text>
              </View>
              <Text style={styles.streakSubtitle}>
                {streakDays > 0 ? 'Keep your momentum going strong!' : 'Start a new streak today'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.smallAnalyzeButton}
              onPress={handleAnalyze}
              activeOpacity={0.8}
            >
              <Text style={[styles.smallAnalyzeText, { color: colors.primary }]}>ANALYZE</Text>
            </TouchableOpacity>
          </View>

          {/* Days Circle Tracker */}
          <View style={styles.daysRow}>
            {daysOfWeek.map((day, index) => {
              const isFilled = index < streakDays;
              return (
                <View key={index} style={styles.dayCol}>
                  <View style={[styles.dayCircle, isFilled && styles.dayCircleFilled]} />
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              );
            })}
          </View>

          {/* Large Bottom Analyze Button */}
          <TouchableOpacity
            style={styles.largeAnalyzeButton}
            onPress={handleAnalyze}
            activeOpacity={0.85}
          >
            <Text style={[styles.largeAnalyzeText, { color: colors.primary }]}>ANALYZE</Text>
          </TouchableOpacity>
        </NeonCard>

        {/* YOUR RANKING Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>YOUR RANKING</Text>
          <NeonCard style={styles.rankingCard} contentStyle={styles.rankingContent}>
            <Text style={styles.rankingText}>
              {runs.length > 0
                ? `You have logged ${runs.length} run session(s). Verified leaderboard rankings update weekly.`
                : 'Complete a verified run to appear on the leaderboard.'}
            </Text>
          </NeonCard>
        </View>

        {/* GLOBAL Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>GLOBAL - {currentMonthName.toUpperCase()}</Text>
          <View style={[styles.emptyStateContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No rankings found for this month yet.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  streakCard: {
    borderRadius: 28,
    marginBottom: 24,
  },
  streakContent: {
    padding: 20,
  },
  streakTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  streakTitleGroup: {
    flex: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  streakSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginTop: 3,
  },
  smallAnalyzeButton: {
    backgroundColor: '#050505',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smallAnalyzeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: 'transparent',
  },
  dayCircleFilled: {
    backgroundColor: '#000000',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  largeAnalyzeButton: {
    backgroundColor: '#050505',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  largeAnalyzeText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  rankingCard: {
    borderRadius: 22,
  },
  rankingContent: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  rankingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 22,
  },
  emptyStateContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
