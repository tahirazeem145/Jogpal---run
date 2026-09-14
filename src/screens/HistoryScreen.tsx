import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NeonCard } from '../components/NeonCard';
import { NeonButton } from '../components/NeonButton';
import { useApp } from '../context/AppContext';
import { offlineSyncService } from '../services/offlineSyncService';
import { RunSession } from '../types/data';
import { useTheme } from '../context/ThemeContext';
import { JogpalMap } from '../components/map/JogpalMap';
import { OfflineSyntheticMap } from '../components/map/OfflineSyntheticMap';
import { LatLng } from '../types/soloRun';

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, userProfile, runs, logNewRun } = useApp();
  const { colors } = useTheme();
  const activeUserId = user?.uid || userProfile?.id || 'guest_runner';
  const [displayRuns, setDisplayRuns] = useState<RunSession[]>(runs);
  const [selectedRun, setSelectedRun] = useState<RunSession | null>(null);

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
        route: p.actualRoute,
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

  const handleRecordFirstRun = async () => {
    await logNewRun(3.2, 890, '4:38 /km', 'MORNING SESSION');
  };

  const formatDuration = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedRouteCoords: LatLng[] = React.useMemo(() => {
    if (!selectedRun || !selectedRun.route) return [];
    return selectedRun.route.map((pt) => ({
      latitude: pt.latitude,
      longitude: pt.longitude,
    }));
  }, [selectedRun]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>RUN HISTORY</Text>
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
              <TouchableOpacity
                key={run.id || index}
                style={styles.section}
                activeOpacity={0.85}
                onPress={() => setSelectedRun(run)}
              >
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
              </TouchableOpacity>
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
      </ScrollView>

      {/* Interactive Run Route Details Modal */}
      <Modal
        visible={!!selectedRun}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedRun(null)}
      >
        {selectedRun && (
          <View style={[styles.modalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={() => setSelectedRun(null)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {selectedRun.title || 'RUN DETAILS'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Route Map */}
              {selectedRouteCoords.length > 0 ? (
                <JogpalMap
                  actualRoute={selectedRouteCoords}
                  style={styles.detailsMap}
                  interactive={true}
                  showStartFinishMarkers={true}
                  fitRouteOnLoad={true}
                />
              ) : (
                <OfflineSyntheticMap
                  currentDistanceKm={selectedRun.distanceKm}
                  targetDistanceKm={selectedRun.distanceKm || 1}
                  routeMode="LOOP"
                  style={styles.detailsMap}
                />
              )}

              {/* Stats Grid */}
              <NeonCard style={styles.detailsCard} contentStyle={styles.detailsCardContent}>
                <View style={styles.detailsRow}>
                  <View style={styles.detailsCol}>
                    <Text style={[styles.detailsValue, { color: colors.primary }]}>
                      {selectedRun.distanceKm.toFixed(2)}
                    </Text>
                    <Text style={styles.detailsLabel}>DISTANCE (KM)</Text>
                  </View>
                  <View style={styles.detailsCol}>
                    <Text style={styles.detailsValue}>
                      {formatDuration(selectedRun.durationSeconds)}
                    </Text>
                    <Text style={styles.detailsLabel}>DURATION</Text>
                  </View>
                </View>

                <View style={styles.detailsDivider} />

                <View style={styles.detailsRow}>
                  <View style={styles.detailsCol}>
                    <Text style={styles.detailsValue}>{selectedRun.pace || '--:--'}</Text>
                    <Text style={styles.detailsLabel}>AVG PACE</Text>
                  </View>
                  <View style={styles.detailsCol}>
                    <Text style={styles.detailsValue}>
                      {selectedRun.calories || Math.round(selectedRun.distanceKm * 62)} kcal
                    </Text>
                    <Text style={styles.detailsLabel}>CALORIES</Text>
                  </View>
                </View>
              </NeonCard>

              <NeonButton
                title="CLOSE DETAILS"
                onPress={() => setSelectedRun(null)}
                style={styles.closeDetailsBtn}
              />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 24,
    marginBottom: 20,
  },
  summaryContent: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  summaryHeader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#8E8E93',
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statMedium: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sessionCard: {
    borderRadius: 20,
  },
  sessionContent: {
    padding: 16,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  soloBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  soloBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  quickRecordButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickRecordText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  detailsMap: {
    height: 300,
    marginBottom: 16,
  },
  detailsCard: {
    borderRadius: 20,
    marginBottom: 20,
  },
  detailsCardContent: {
    padding: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailsValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  detailsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
    marginTop: 4,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 16,
  },
  closeDetailsBtn: {
    marginTop: 8,
  },
});
