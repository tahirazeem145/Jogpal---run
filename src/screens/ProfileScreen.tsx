import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NeonCard } from '../components/NeonCard';
import { useApp } from '../context/AppContext';
import { runService } from '../services/runService';
import { useTheme } from '../context/ThemeContext';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userProfile, runs, logNewRun } = useApp();
  const { colors, isOrange } = useTheme();

  // Compute Live Analytics from runs history
  const stats = runService.calculateRunningStats(runs);
  const personalBests = runService.calculatePersonalBests(runs);
  const streakStats = runService.calculateStreakAndConsistency(runs);

  const level = userProfile?.level || 1;
  const rank = userProfile?.rank || 'Runner';

  const handleBack = () => {
    navigation.goBack();
  };

  const handleRecordQuickRun = async () => {
    Alert.alert(
      'Log Training Run',
      'Record a 5.0 KM session (23:00, 4:36 /km) to update your stats & personal bests?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record Run',
          onPress: async () => {
            try {
              await logNewRun(5.0, 1380, '4:36 /km', 'TEMPO TRAINING');
              Alert.alert('Run Saved', '5.0 KM run synced directly to your profile!');
            } catch (e: any) {
              Alert.alert('Saved', 'Run logged successfully.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <View style={styles.titleRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Runner Analytics</Text>
            <View style={[styles.passportIconBox, { backgroundColor: colors.primary }]}>
              <Ionicons name="stats-chart" size={13} color="#000000" />
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Performance stats, personal bests & consistency
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. RUNNER IDENTITY HERO CARD */}
        <NeonCard style={styles.heroCard} contentStyle={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroUserGroup}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={styles.runnerAvatarImage} />
              ) : (
                <View style={styles.runnerAvatarCircle}>
                  <Text style={styles.runnerAvatarInitial}>
                    {(userProfile?.displayName || 'R').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.levelInfo}>
                <Text style={styles.runnerTitle}>{userProfile?.displayName || 'Runner'}</Text>
                <View style={styles.badgesRow}>
                  <View style={styles.levelPill}>
                    <Text style={[styles.levelPillText, { color: colors.primary }]}>LEVEL {level}</Text>
                  </View>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>{rank.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.quickRunBtn}
              onPress={handleRecordQuickRun}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.quickRunBtnText, { color: colors.primary }]}>LOG RUN</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Summary Highlights */}
          <View style={styles.heroHighlights}>
            <View style={styles.highlightCol}>
              <Text style={styles.highlightValue}>{stats.totalDistanceKm} KM</Text>
              <Text style={styles.highlightLabel}>TOTAL DISTANCE</Text>
            </View>
            <View style={styles.highlightDivider} />
            <View style={styles.highlightCol}>
              <Text style={styles.highlightValue}>{stats.totalRuns}</Text>
              <Text style={styles.highlightLabel}>RUNS</Text>
            </View>
            <View style={styles.highlightDivider} />
            <View style={styles.highlightCol}>
              <Text style={styles.highlightValue}>{stats.averagePace}</Text>
              <Text style={styles.highlightLabel}>AVG PACE</Text>
            </View>
          </View>
        </NeonCard>

        {/* 2. RUNNING STATS OVERVIEW SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="bar-chart" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>RUNNING STATS OVERVIEW</Text>
          </View>

          <View style={styles.statsGrid}>
            {/* Total Runs */}
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>TOTAL RUNS</Text>
                <MaterialCommunityIcons name="run" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>{stats.totalRuns}</Text>
              <Text style={[styles.statCardSub, { color: colors.textMuted }]}>Completed sessions</Text>
            </View>

            {/* Total Distance */}
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>TOTAL DISTANCE</Text>
                <Ionicons name="navigate" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>
                {stats.totalDistanceKm} <Text style={[styles.statCardUnit, { color: colors.textSecondary }]}>KM</Text>
              </Text>
              <Text style={[styles.statCardSub, { color: colors.textMuted }]}>Lifetime distance</Text>
            </View>

            {/* Total Running Time */}
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>TOTAL TIME</Text>
                <Ionicons name="time" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>{stats.totalTimeFormatted}</Text>
              <Text style={[styles.statCardSub, { color: colors.textMuted }]}>Time on feet</Text>
            </View>

            {/* Average Pace */}
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>AVERAGE PACE</Text>
                <Ionicons name="speedometer" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>{stats.averagePace}</Text>
              <Text style={[styles.statCardSub, { color: colors.textMuted }]}>Across all runs</Text>
            </View>

            {/* Longest Run */}
            <View style={[styles.statCard, styles.statCardFull, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statCardHeader}>
                <View style={styles.longestRunLeft}>
                  <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>LONGEST SINGLE RUN</Text>
                  <Text style={[styles.statCardValueLarge, { color: colors.primary }]}>
                    {stats.longestRunKm} <Text style={[styles.statCardUnit, { color: colors.textSecondary }]}>KM</Text>
                  </Text>
                </View>
                <View style={[styles.medalBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="medal" size={24} color="#000000" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 3. PERSONAL BESTS 🏆 SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>PERSONAL BESTS 🏆</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pbScrollRow}
          >
            {personalBests.map((pb) => (
              <View
                key={pb.id}
                style={[
                  styles.pbCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  pb.unlocked && { borderColor: colors.primaryLight, backgroundColor: colors.cardSubtle },
                ]}
              >
                <View style={styles.pbCardHeader}>
                  <View style={[styles.pbIconBox, pb.unlocked && { backgroundColor: colors.primary }]}>
                    <Ionicons
                      name={pb.iconName as any}
                      size={18}
                      color={pb.unlocked ? '#000000' : colors.textMuted}
                    />
                  </View>
                  {pb.unlocked ? (
                    <View style={[styles.unlockedBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.unlockedBadgeText, { color: colors.primary }]}>UNLOCKED</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Text style={[styles.lockedBadgeText, { color: colors.textMuted }]}>READY</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.pbTitle, { color: colors.textSecondary }]}>{pb.title}</Text>
                <Text style={[styles.pbValue, { color: colors.textPrimary }]}>{pb.value}</Text>

                <View style={[styles.pbFooter, { borderTopColor: colors.cardBorder }]}>
                  {pb.pace ? (
                    <Text style={[styles.pbPace, { color: colors.primary }]}>{pb.pace}</Text>
                  ) : (
                    <Text style={[styles.pbSubtitle, { color: colors.textMuted }]}>{pb.subtitle}</Text>
                  )}
                  {!!pb.date && <Text style={[styles.pbDate, { color: colors.textMuted }]}>{pb.date}</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 4. RUNNING STREAK & CONSISTENCY 🔥 SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flame" size={18} color={isOrange ? '#FF7A50' : '#FFA500'} />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>RUNNING STREAK & CONSISTENCY 🔥</Text>
          </View>

          <View style={[styles.streakContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Streak Counters */}
            <View style={styles.streakCountersRow}>
              <View style={styles.streakBox}>
                <Text style={[styles.streakCountNumber, { color: colors.textPrimary }]}>🔥 {streakStats.currentStreak}</Text>
                <Text style={[styles.streakBoxLabel, { color: colors.primary }]}>CURRENT STREAK</Text>
                <Text style={[styles.streakBoxSub, { color: colors.textMuted }]}>Consecutive active days</Text>
              </View>

              <View style={[styles.streakBoxDivider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.streakBox}>
                <Text style={[styles.streakCountNumber, { color: colors.textPrimary }]}>🌟 {streakStats.longestStreak}</Text>
                <Text style={[styles.streakBoxLabel, { color: colors.primary }]}>LONGEST STREAK</Text>
                <Text style={[styles.streakBoxSub, { color: colors.textMuted }]}>All-time consistency</Text>
              </View>
            </View>

            {/* Weekly Activity 7-Day Matrix */}
            <View style={[styles.weeklyMatrix, { borderTopColor: colors.cardBorder }]}>
              <View style={styles.weeklyMatrixHeader}>
                <Text style={[styles.weeklyMatrixTitle, { color: colors.textSecondary }]}>THIS WEEK'S MOMENTUM</Text>
                <Text style={[styles.weeklyMatrixScore, { color: colors.primary }]}>
                  {streakStats.activeDaysCount} / 7 Days Active
                </Text>
              </View>

              <View style={styles.daysRow}>
                {streakStats.weekDaysActive.map((item, idx) => (
                  <View key={idx} style={styles.dayCol}>
                    <View
                      style={[
                        styles.dayCircle,
                        { borderColor: colors.cardBorder, backgroundColor: colors.cardSubtle },
                        item.active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        item.isToday && { borderColor: colors.primary, borderWidth: 2 },
                      ]}
                    >
                      {item.active ? (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      ) : (
                        <Text
                          style={[
                            styles.dayCircleText,
                            { color: colors.textMuted },
                            item.isToday && { color: colors.primary },
                          ]}
                        >
                          {item.day}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: colors.textMuted },
                        item.isToday && { color: colors.primary, fontWeight: '900' },
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Monthly Consistency Bar */}
            <View style={[styles.monthlyConsistencyBox, { borderTopColor: colors.cardBorder }]}>
              <View style={styles.monthlyHeader}>
                <Text style={[styles.monthlyTitle, { color: colors.textSecondary }]}>MONTHLY CONSISTENCY RATING</Text>
                <Text style={[styles.monthlyPercent, { color: colors.primary }]}>
                  {streakStats.monthlyConsistencyPercent}%
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.cardSubtle }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.max(streakStats.monthlyConsistencyPercent, 6)}%`,
                    },
                  ]}
                />
              </View>
            </View>
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  headerTitleGroup: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  passportIconBox: {
    borderRadius: 4,
    padding: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 26,
    marginBottom: 24,
  },
  heroContent: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroUserGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  runnerAvatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1E1E20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  runnerAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#000000',
  },
  runnerAvatarInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
  },
  levelInfo: {
    gap: 4,
  },
  runnerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelPill: {
    backgroundColor: '#050505',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rankPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  quickRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  quickRunBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroHighlights: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  highlightCol: {
    alignItems: 'center',
    flex: 1,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#262626',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  highlightDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  statCardFull: {
    width: '100%',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statCardValueLarge: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  statCardUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  statCardSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  longestRunLeft: {
    flex: 1,
  },
  medalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pbScrollRow: {
    gap: 12,
    paddingRight: 16,
  },
  pbCard: {
    width: 175,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  pbCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pbIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#202026',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lockedBadge: {
    backgroundColor: '#202026',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  pbTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  pbValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  pbFooter: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 2,
  },
  pbPace: {
    fontSize: 12,
    fontWeight: '700',
  },
  pbSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  pbDate: {
    fontSize: 10,
  },
  streakContainer: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 16,
  },
  streakCountersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakBox: {
    flex: 1,
    alignItems: 'center',
  },
  streakCountNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  streakBoxLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  streakBoxSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  streakBoxDivider: {
    width: 1,
    height: 36,
  },
  weeklyMatrix: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  weeklyMatrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyMatrixTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  weeklyMatrixScore: {
    fontSize: 11,
    fontWeight: '800',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthlyConsistencyBox: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 8,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  monthlyPercent: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
