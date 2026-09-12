import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NeonCard } from '../components/NeonCard';
import { NeonButton } from '../components/NeonButton';
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { runs, logNewRun } = useApp();

  const totalKm = runs.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  const totalRuns = runs.length;
  const totalSecs = runs.reduce((sum, r) => sum + (r.durationSeconds || 0), 0);
  const totalHours = Math.floor(totalSecs / 3600);
  const totalMins = Math.floor((totalSecs % 3600) / 60);
  const formattedTime = totalHours > 0 ? `${totalHours}:${totalMins.toString().padStart(2, '0')}` : `0:${totalMins.toString().padStart(2, '0')}`;

  const handleBack = () => {
    Alert.alert('Navigation', 'Back pressed');
  };

  const handleViewDetails = () => {
    Alert.alert('Running History', `${totalRuns} total logged runs, totaling ${totalKm.toFixed(1)} KM.`);
  };

  const handleSparkle = () => {
    Alert.alert('History AI', 'Analyzing your historical pace and distance trends from Firebase.');
  };

  const handleRecordFirstRun = async () => {
    await logNewRun(3.2, 890, '4:38 /km', 'MORNING SESSION');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HISTORY</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Card: YOUR RUNNING JOURNEY */}
        <NeonCard style={styles.summaryCard} contentStyle={styles.summaryContent}>
          <Text style={styles.summaryHeader}>YOUR RUNNING JOURNEY</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statBig}>{totalKm.toFixed(1)}</Text>
              <Text style={styles.statLabel}>KM</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statBig}>{totalRuns}</Text>
              <Text style={styles.statLabel}>RUNS</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statBig}>{formattedTime}</Text>
              <Text style={styles.statLabel}>TIME</Text>
            </View>
          </View>
        </NeonCard>

        {/* Dynamic Run List / Empty State */}
        {runs.length > 0 ? (
          runs.map((run, index) => {
            const dateStr = new Date(run.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const durationMin = Math.floor(run.durationSeconds / 60);
            const durationSec = run.durationSeconds % 60;
            const timeStr = `${durationMin.toString().padStart(2, '0')}:${durationSec.toString().padStart(2, '0')}`;

            return (
              <View key={run.id || index} style={styles.section}>
                <Text style={styles.sectionHeader}>
                  {index === 0 ? 'LATEST RUN' : dateStr.toUpperCase()}
                </Text>
                <NeonCard style={styles.sessionCard} contentStyle={styles.sessionContent}>
                  <View style={styles.sessionTopRow}>
                    <Text style={styles.dateLabel}>{dateStr}</Text>
                    {run.type && (
                      <View style={styles.soloBadge}>
                        <Text style={styles.soloBadgeText}>{run.type}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.sessionTitle}>{run.title || 'RUN SESSION'}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.statMedium}>{run.distanceKm.toFixed(2)}</Text>
                      <Text style={styles.statLabel}>KM</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statMedium}>{timeStr}</Text>
                      <Text style={styles.statLabel}>TIME</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statMedium}>{run.pace || '--:--'}</Text>
                      <Text style={styles.statLabel}>PACE</Text>
                    </View>
                  </View>
                </NeonCard>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO LOGGED RUNS YET</Text>
            <Text style={styles.emptyText}>
              Start a solo run or record your first session to see your running history.
            </Text>
            <TouchableOpacity style={styles.quickRecordButton} onPress={handleRecordFirstRun}>
              <Text style={styles.quickRecordText}>+ Log 3.2 KM Run</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VIEW DETAILS Action Button */}
        <NeonButton
          title="VIEW DETAILS"
          onPress={handleViewDetails}
          style={styles.viewDetailsButton}
        />
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
    color: colors.textPrimary,
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
  summaryCard: {
    borderRadius: 24,
    marginBottom: 24,
  },
  summaryContent: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  summaryHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statBig: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  statMedium: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sessionCard: {
    borderRadius: 24,
  },
  sessionContent: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  soloBadge: {
    backgroundColor: '#050505',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  soloBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.8,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: '#151517',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242428',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  quickRecordButton: {
    backgroundColor: '#1A260D',
    borderWidth: 1,
    borderColor: colors.limePrimary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickRecordText: {
    color: colors.limePrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  viewDetailsButton: {
    marginTop: 10,
    marginBottom: 20,
  },
});
