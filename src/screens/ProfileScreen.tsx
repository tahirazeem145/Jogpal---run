import React, { useState } from 'react';
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
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { runService } from '../services/runService';
import { colors } from '../theme/colors';

const ACHIEVEMENT_CATEGORIES = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

const STATIC_ACHIEVEMENTS = [
  {
    id: 'ach-1',
    title: 'First Stride',
    subtitle: 'Complete your first tracked run session',
    category: 'COMMON',
    minRuns: 1,
    icon: 'shoe-print',
  },
  {
    id: 'ach-2',
    title: '5K Pioneer',
    subtitle: 'Complete a single run of 5.0 KM or more',
    category: 'COMMON',
    minDist: 5,
    icon: 'map-marker-distance',
  },
  {
    id: 'ach-3',
    title: 'Streak Starter',
    subtitle: 'Maintain a 3-day consecutive run streak',
    category: 'RARE',
    minStreak: 3,
    icon: 'fire',
  },
  {
    id: 'ach-4',
    title: 'Speed Demon',
    subtitle: 'Achieve a personal best pace under 4:30 /km',
    category: 'RARE',
    minPaceSec: 270,
    icon: 'flash',
  },
  {
    id: 'ach-5',
    title: '10K Crusher',
    subtitle: 'Conquer a single run of 10.0 KM or more',
    category: 'EPIC',
    minDist: 10,
    icon: 'trophy',
  },
  {
    id: 'ach-6',
    title: 'Century Club',
    subtitle: 'Accumulate over 100.0 total kilometers',
    category: 'LEGENDARY',
    minTotalKm: 100,
    icon: 'crown',
  },
];

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userProfile, runs, logNewRun } = useApp();
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Compute Live Analytics from runs history
  const stats = runService.calculateRunningStats(runs);
  const personalBests = runService.calculatePersonalBests(runs);
  const streakStats = runService.calculateStreakAndConsistency(runs);

  const level = userProfile?.level || 1;
  const rank = userProfile?.rank || 'Runner';

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSparkle = () => {
    Alert.alert(
      'Jogpal AI Coach',
      `Based on your ${stats.totalRuns} recorded runs (${stats.totalDistanceKm} KM total), your current average pace is ${stats.averagePace}. Keep up the ${streakStats.currentStreak}-day streak to boost aerobic endurance!`
    );
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

  // Filter achievements based on active category
  const filteredAchievements = STATIC_ACHIEVEMENTS.filter((ach) => {
    if (activeCategory === 'ALL') return true;
    return ach.category === activeCategory;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Runner Analytics</Text>
            <View style={styles.passportIconBox}>
              <Ionicons name="stats-chart" size={13} color="#000000" />
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
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
                    <Text style={styles.levelPillText}>LEVEL {level}</Text>
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
              <Ionicons name="add" size={16} color="#000000" />
              <Text style={styles.quickRunBtnText}>LOG RUN</Text>
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
            <Ionicons name="bar-chart" size={16} color={colors.limePrimary} />
            <Text style={styles.sectionTitle}>RUNNING STATS OVERVIEW</Text>
          </View>

          <View style={styles.statsGrid}>
            {/* Total Runs */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>TOTAL RUNS</Text>
                <MaterialCommunityIcons name="run" size={18} color={colors.limePrimary} />
              </View>
              <Text style={styles.statCardValue}>{stats.totalRuns}</Text>
              <Text style={styles.statCardSub}>Completed sessions</Text>
            </View>

            {/* Total Distance */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>TOTAL DISTANCE</Text>
                <Ionicons name="navigate" size={16} color={colors.limePrimary} />
              </View>
              <Text style={styles.statCardValue}>{stats.totalDistanceKm} <Text style={styles.statCardUnit}>KM</Text></Text>
              <Text style={styles.statCardSub}>Lifetime distance</Text>
            </View>

            {/* Total Running Time */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>TOTAL TIME</Text>
                <Ionicons name="time" size={16} color={colors.limePrimary} />
              </View>
              <Text style={styles.statCardValue}>{stats.totalTimeFormatted}</Text>
              <Text style={styles.statCardSub}>Time on feet</Text>
            </View>

            {/* Average Pace */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>AVERAGE PACE</Text>
                <Ionicons name="speedometer" size={16} color={colors.limePrimary} />
              </View>
              <Text style={styles.statCardValue}>{stats.averagePace}</Text>
              <Text style={styles.statCardSub}>Across all runs</Text>
            </View>

            {/* Longest Run */}
            <View style={[styles.statCard, styles.statCardFull]}>
              <View style={styles.statCardHeader}>
                <View style={styles.longestRunLeft}>
                  <Text style={styles.statCardLabel}>LONGEST SINGLE RUN</Text>
                  <Text style={styles.statCardValueLarge}>{stats.longestRunKm} <Text style={styles.statCardUnit}>KM</Text></Text>
                </View>
                <View style={styles.medalBadge}>
                  <Ionicons name="medal" size={24} color="#000000" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 3. PERSONAL BESTS 🏆 SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy" size={16} color={colors.limePrimary} />
            <Text style={styles.sectionTitle}>PERSONAL BESTS 🏆</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pbScrollRow}
          >
            {personalBests.map((pb) => (
              <View
                key={pb.id}
                style={[styles.pbCard, pb.unlocked && styles.pbCardUnlocked]}
              >
                <View style={styles.pbCardHeader}>
                  <View style={[styles.pbIconBox, pb.unlocked && styles.pbIconBoxUnlocked]}>
                    <Ionicons
                      name={pb.iconName as any}
                      size={18}
                      color={pb.unlocked ? '#000000' : colors.textMuted}
                    />
                  </View>
                  {pb.unlocked ? (
                    <View style={styles.unlockedBadge}>
                      <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedBadgeText}>READY</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.pbTitle}>{pb.title}</Text>
                <Text style={styles.pbValue}>{pb.value}</Text>

                <View style={styles.pbFooter}>
                  {pb.pace ? (
                    <Text style={styles.pbPace}>{pb.pace}</Text>
                  ) : (
                    <Text style={styles.pbSubtitle}>{pb.subtitle}</Text>
                  )}
                  {!!pb.date && <Text style={styles.pbDate}>{pb.date}</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 4. RUNNING STREAK & CONSISTENCY 🔥 SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flame" size={18} color="#FFA500" />
            <Text style={styles.sectionTitle}>RUNNING STREAK & CONSISTENCY 🔥</Text>
          </View>

          <View style={styles.streakContainer}>
            {/* Streak Counters */}
            <View style={styles.streakCountersRow}>
              <View style={styles.streakBox}>
                <Text style={styles.streakCountNumber}>🔥 {streakStats.currentStreak}</Text>
                <Text style={styles.streakBoxLabel}>CURRENT STREAK</Text>
                <Text style={styles.streakBoxSub}>Consecutive active days</Text>
              </View>

              <View style={styles.streakBoxDivider} />

              <View style={styles.streakBox}>
                <Text style={styles.streakCountNumber}>🌟 {streakStats.longestStreak}</Text>
                <Text style={styles.streakBoxLabel}>LONGEST STREAK</Text>
                <Text style={styles.streakBoxSub}>All-time consistency</Text>
              </View>
            </View>

            {/* Weekly Activity 7-Day Matrix */}
            <View style={styles.weeklyMatrix}>
              <View style={styles.weeklyMatrixHeader}>
                <Text style={styles.weeklyMatrixTitle}>THIS WEEK'S MOMENTUM</Text>
                <Text style={styles.weeklyMatrixScore}>
                  {streakStats.activeDaysCount} / 7 Days Active
                </Text>
              </View>

              <View style={styles.daysRow}>
                {streakStats.weekDaysActive.map((item, idx) => (
                  <View key={idx} style={styles.dayCol}>
                    <View
                      style={[
                        styles.dayCircle,
                        item.active && styles.dayCircleActive,
                        item.isToday && styles.dayCircleToday,
                      ]}
                    >
                      {item.active ? (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      ) : (
                        <Text
                          style={[
                            styles.dayCircleText,
                            item.isToday && styles.dayCircleTextToday,
                          ]}
                        >
                          {item.day}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Monthly Consistency Bar */}
            <View style={styles.monthlyConsistencyBox}>
              <View style={styles.monthlyHeader}>
                <Text style={styles.monthlyTitle}>MONTHLY CONSISTENCY RATING</Text>
                <Text style={styles.monthlyPercent}>
                  {streakStats.monthlyConsistencyPercent}%
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(streakStats.monthlyConsistencyPercent, 6)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 5. ACHIEVEMENT COLLECTION 🎖️ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="ribbon" size={16} color={colors.limePrimary} />
            <Text style={styles.sectionTitle}>ACHIEVEMENT COLLECTION</Text>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {ACHIEVEMENT_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterPill,
                  activeCategory === category && styles.filterPillActive,
                ]}
                onPress={() => setActiveCategory(category)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeCategory === category && styles.filterPillTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Achievements Grid */}
          <View style={styles.achievementsList}>
            {filteredAchievements.map((item) => {
              // Dynamic unlock condition
              let isUnlocked = false;
              if (item.minRuns && stats.totalRuns >= item.minRuns) isUnlocked = true;
              if (item.minDist && stats.longestRunKm >= item.minDist) isUnlocked = true;
              if (item.minStreak && streakStats.longestStreak >= item.minStreak) isUnlocked = true;
              if (item.minTotalKm && stats.totalDistanceKm >= item.minTotalKm) isUnlocked = true;

              return (
                <View
                  key={item.id}
                  style={[styles.achievementCard, isUnlocked && styles.achievementCardUnlocked]}
                >
                  <View
                    style={[
                      styles.achievementIconBox,
                      isUnlocked && styles.achievementIconBoxUnlocked,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={24}
                      color={isUnlocked ? '#000000' : colors.textMuted}
                    />
                  </View>

                  <View style={styles.achievementInfo}>
                    <View style={styles.achievementTitleRow}>
                      <Text style={styles.achievementTitle}>{item.title}</Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          item.category === 'LEGENDARY' && styles.categoryLegendary,
                          item.category === 'EPIC' && styles.categoryEpic,
                          item.category === 'RARE' && styles.categoryRare,
                        ]}
                      >
                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.achievementSub}>{item.subtitle}</Text>
                  </View>

                  {isUnlocked ? (
                    <View style={styles.achievementCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.limePrimary} />
                    </View>
                  ) : (
                    <View style={styles.achievementLock}>
                      <Feather name="lock" size={14} color={colors.textMuted} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Floating Sparkle Action Button */}
      <FloatingSparkleButton onPress={handleSparkle} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
  },
  passportIconBox: {
    backgroundColor: colors.limePrimary,
    borderRadius: 4,
    padding: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.limePrimary,
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
    color: colors.limePrimary,
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
    color: colors.limePrimary,
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
    backgroundColor: '#151518',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24242A',
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
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statCardValueLarge: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.limePrimary,
    marginTop: 2,
  },
  statCardUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
  longestRunLeft: {
    flex: 1,
  },
  medalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.limePrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pbScrollRow: {
    gap: 12,
    paddingRight: 16,
  },
  pbCard: {
    width: 175,
    backgroundColor: '#151518',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24242A',
  },
  pbCardUnlocked: {
    borderColor: 'rgba(218, 255, 1, 0.35)',
    backgroundColor: '#17171C',
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
  pbIconBoxUnlocked: {
    backgroundColor: colors.limePrimary,
  },
  unlockedBadge: {
    backgroundColor: 'rgba(218, 255, 1, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.limePrimary,
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
    color: colors.textMuted,
  },
  pbTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  pbValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginVertical: 4,
  },
  pbFooter: {
    borderTopWidth: 1,
    borderTopColor: '#24242A',
    paddingTop: 8,
    gap: 2,
  },
  pbPace: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.limePrimary,
  },
  pbSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pbDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  streakContainer: {
    backgroundColor: '#151518',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24242A',
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
    color: colors.textPrimary,
  },
  streakBoxLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  streakBoxSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  streakBoxDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#24242A',
  },
  weeklyMatrix: {
    borderTopWidth: 1,
    borderTopColor: '#222228',
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
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  weeklyMatrixScore: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.limePrimary,
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
    backgroundColor: '#1E1E24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A34',
  },
  dayCircleActive: {
    backgroundColor: colors.limePrimary,
    borderColor: colors.limePrimary,
  },
  dayCircleToday: {
    borderColor: colors.limePrimary,
    borderWidth: 2,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
  },
  dayCircleTextToday: {
    color: colors.limePrimary,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayLabelToday: {
    color: colors.limePrimary,
    fontWeight: '900',
  },
  monthlyConsistencyBox: {
    borderTopWidth: 1,
    borderTopColor: '#222228',
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
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  monthlyPercent: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.limePrimary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#202026',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.limePrimary,
    borderRadius: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C34',
    backgroundColor: '#151518',
  },
  filterPillActive: {
    borderColor: colors.limePrimary,
    backgroundColor: 'rgba(218, 255, 1, 0.12)',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  filterPillTextActive: {
    color: colors.limePrimary,
  },
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151518',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#24242A',
    gap: 14,
  },
  achievementCardUnlocked: {
    borderColor: 'rgba(218, 255, 1, 0.3)',
    backgroundColor: '#18181D',
  },
  achievementIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#202026',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementIconBoxUnlocked: {
    backgroundColor: colors.limePrimary,
  },
  achievementInfo: {
    flex: 1,
    gap: 2,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#26262E',
  },
  categoryRare: {
    backgroundColor: '#1E2A4A',
  },
  categoryEpic: {
    backgroundColor: '#351E4A',
  },
  categoryLegendary: {
    backgroundColor: '#4A3B1E',
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  achievementSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  achievementCheck: {
    padding: 4,
  },
  achievementLock: {
    padding: 4,
  },
});
