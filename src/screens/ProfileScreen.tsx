import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NeonCard } from '../components/NeonCard';
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

const achievementCategories = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const [activeCategory, setActiveCategory] = useState('ALL');

  const totalJogs = userProfile?.totalJogs || 0;
  const totalKm = userProfile?.totalDistanceKm || 0;
  const streakDays = userProfile?.streakDays || 0;
  const recordsCount = userProfile?.recordsCount || 0;
  const level = userProfile?.level || 1;
  const unlocked = userProfile?.passportUnlockedCount || 0;
  const totalUnlocked = userProfile?.passportTotalCount || 30;
  const completionPercent = Math.round((unlocked / (totalUnlocked || 1)) * 100);

  const handleBack = () => {
    Alert.alert('Navigation', 'Back pressed');
  };

  const handleSparkle = () => {
    Alert.alert('Passport AI', 'Analyzing your Jogpal journey milestones from Firebase...');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Jogpal Passport</Text>
            <View style={styles.passportIconBox}>
              <Ionicons name="id-card" size={14} color="#000000" />
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Your journey. Your places. Your achievements.
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Runner Passport Hero Card */}
        <NeonCard style={styles.heroCard} contentStyle={styles.heroContent}>
          {/* Top Row: Avatar, Level, Trophy */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroUserGroup}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={styles.runnerAvatarImage} />
              ) : (
                <View style={styles.runnerAvatarCircle}>
                  <MaterialCommunityIcons name="run-fast" size={24} color="#FFA500" />
                </View>
              )}
              <View style={styles.levelInfo}>
                <Text style={styles.runnerTitle}>{userProfile?.displayName || 'Runner'}</Text>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>LEVEL {level}</Text>
                </View>
              </View>
            </View>

            <View style={styles.trophyBox}>
              <Ionicons name="trophy" size={24} color={colors.limePrimary} />
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{totalJogs}</Text>
              <Text style={styles.statLabel}>JOGS</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statValue}>{totalKm.toFixed(1)} KM</Text>
              <Text style={styles.statLabel}>TOTAL DISTANCE</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statValue}>🔥 {streakDays}d</Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statValue}>🏆 {recordsCount}</Text>
              <Text style={styles.statLabel}>RECORDS</Text>
            </View>
          </View>
        </NeonCard>

        {/* Passport Completion Bar Card */}
        <NeonCard style={styles.completionCard} contentStyle={styles.completionContent}>
          <View style={styles.completionHeaderRow}>
            <Text style={styles.completionTitle}>PASSPORT COMPLETION</Text>
            <Text style={styles.completionSubtitle}>
              {completionPercent}% • {unlocked}/{totalUnlocked} Unlocked
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.min(completionPercent, 100)}%` }]}>
              <View style={styles.progressEndDot} />
            </View>
          </View>
        </NeonCard>

        {/* YOUR JOGPAL JOURNEY Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR JOGPAL JOURNEY</Text>
          <NeonCard style={styles.bannerCard} contentStyle={styles.bannerContent}>
            <View style={styles.bannerInner} />
          </NeonCard>
        </View>

        {/* PLACES EXPLORED Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLACES EXPLORED</Text>
          <NeonCard style={styles.bannerCard} contentStyle={styles.bannerContent}>
            <View style={styles.bannerInner} />
          </NeonCard>
        </View>

        {/* ACHIEVEMENT COLLECTION Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACHIEVEMENT COLLECTION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {achievementCategories.map((category) => (
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
        </View>

        {/* PERSONAL RECORDS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERSONAL RECORDS</Text>
          <NeonCard style={styles.bannerCard} contentStyle={styles.bannerContent}>
            <View style={styles.bannerInner} />
          </NeonCard>
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
    borderRadius: 28,
    marginBottom: 16,
  },
  heroContent: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroUserGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  runnerAvatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1E1E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  runnerAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: colors.limePrimary,
  },
  levelInfo: {
    gap: 4,
  },
  runnerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  levelPill: {
    backgroundColor: '#050505',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.5,
  },
  trophyBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  completionCard: {
    borderRadius: 22,
    marginBottom: 20,
  },
  completionContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  completionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  completionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 8,
  },
  progressEndDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.limePrimary,
    marginRight: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  bannerCard: {
    height: 54,
    borderRadius: 18,
  },
  bannerContent: {
    padding: 0,
    height: '100%',
  },
  bannerInner: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4A6B0A',
    backgroundColor: '#101607',
  },
  filterPillActive: {
    borderColor: colors.limePrimary,
    backgroundColor: '#1C260D',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  filterPillTextActive: {
    color: colors.limePrimary,
  },
});
