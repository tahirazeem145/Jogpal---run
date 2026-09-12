import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NeonCard } from '../components/NeonCard';
import { NeonButton } from '../components/NeonButton';
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { offlineSyncService } from '../services/offlineSyncService';
import { RunSession } from '../types/data';
import { useTheme } from '../theme/colors';

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, userProfile, runs, logNewRun } = useApp();
  const { colors } = useTheme();
  const activeUserId = user?.uid || userProfile?.id || 'guest_runner';
  const [displayRuns, setDisplayRuns] = React.useState<RunSession[]>(runs);

  React.useEffect(() => {
    let isMounted = true;
    offlineSyncService.getPendingRuns().then((pending) => {
      if (!isMounted) return;
      const userPending = pending.filter((p) => p.userId === activeUserId);
      const pendingConverted: RunSession[] = userPending.map((p) => ({
        id: p.localId,
        userId: p.userId,
        title: p.title,
        type: p.type,
        distanceKm: p.distanceKm,
        durationSeconds: p.durationSeconds,
        pace: p.pace,
        createdAt: p.createdAt,
      }));

      // Combine synced runs + pending unsynced runs (deduplicating by id/createdAt)
      const map = new Map<string, RunSession>();
      runs.forEach((r: RunSession) => map.set(r.id || r.createdAt, r));
      pendingConverted.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setDisplayRuns(combined);
    });

    return () => {
      isMounted = false;
    };
  }, [runs, activeUserId]);

  const totalKm = displayRuns.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  const totalRuns = displayRuns.length;
  const totalSecs = displayRuns.reduce((sum, r) => sum + (r.durationSeconds || 0), 0);
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>HISTORY</Text>
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
        {displayRuns.length > 0 ? (
          displayRuns.map((run, index) => {
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
                <Text style={[styles.sectionHeader, { color: colors.primary }]}>
                  {index === 0 ? 'LATEST RUN' : dateStr.toUpperCase()}
                </Text>
                <NeonCard style={styles.sessionCard} contentStyle={styles.sessionContent}>
                  <View style={styles.sessionTopRow}>
                    <Text style={styles.dateLabel}>{dateStr}</Text>
                    {run.type && (
                      <View style={styles.soloBadge}>
                        <Text style={[styles.soloBadgeText, { color: colors.primary }]}>{run.type}</Text>
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
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>NO LOGGED RUNS YET</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Start a solo run or record your first session to see your running history.
            </Text>
            <TouchableOpacity
              style={[styles.quickRecordButton, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}
              onPress={handleRecordFirstRun}
            >
              <Text style={[styles.quickRecordText, { color: colors.primary }]}>+ Log 3.2 KM Run</Text>
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
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  quickRecordButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickRecordText: {
    fontSize: 12,
    fontWeight: '900',
  },
  viewDetailsButton: {
    marginTop: 10,
    marginBottom: 20,
  },
});
