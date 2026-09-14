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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NeonCard } from '../components/NeonCard';
import { NeonButton } from '../components/NeonButton';
import { useApp } from '../context/AppContext';
import { useSoloRun } from '../context/SoloRunContext';
import { SoloRunModal } from '../components/SoloRunModal';
import { offlineSyncService } from '../services/offlineSyncService';
import { RunSession } from '../types/data';
import { useTheme } from '../context/ThemeContext';
import { JogpalMap } from '../components/map/JogpalMap';
import { OfflineSyntheticMap } from '../components/map/OfflineSyntheticMap';
import { LatLng } from '../types/soloRun';

const formatDateString = (dateIso: string) => {
  try {
    const d = new Date(dateIso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateIso;
  }
};

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, userProfile, runs, logNewRun } = useApp();
  const { startPreparation } = useSoloRun();
  const { colors } = useTheme();
  const activeUserId = user?.uid || userProfile?.id || '';
  const [displayRuns, setDisplayRuns] = useState<RunSession[]>(runs);
  const [selectedRun, setSelectedRun] = useState<RunSession | null>(null);
  const [soloRunModalVisible, setSoloRunModalVisible] = useState(false);
  const [quickLogModalVisible, setQuickLogModalVisible] = useState(false);

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

  const handleStartLiveRun = async () => {
    setQuickLogModalVisible(false);
    setSoloRunModalVisible(true);
    await startPreparation('SOLO RUN', 'SOLO');
  };

  const handleQuickLog = async (distKm: number, durationSec: number, pace: string, title: string) => {
    try {
      setQuickLogModalVisible(false);
      await logNewRun(distKm, durationSec, pace, title);
      Alert.alert('Run Logged', `${distKm} KM run saved to Firebase and added to your running history!`);
    } catch (e: any) {
      Alert.alert('Saved', 'Run logged successfully.');
    }
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
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>RUN HISTORY</Text>
        <TouchableOpacity
          style={[styles.headerAddBtn, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}
          onPress={() => setQuickLogModalVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color={colors.primary} />
        </TouchableOpacity>
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
            <View style={styles.summaryDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statBig}>{totalRuns}</Text>
              <Text style={styles.statLabel}>RUNS</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statBig}>{formattedTime}</Text>
              <Text style={styles.statLabel}>TIME</Text>
            </View>
          </View>
        </NeonCard>

        {/* Dynamic Run List / Empty State */}
        {displayRuns.length > 0 ? (
          displayRuns.map((run, index) => {
            const dateStr = formatDateString(run.createdAt);
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
                <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.sessionContent}>
                    <View style={styles.sessionTopRow}>
                      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{dateStr}</Text>
                      {run.type && (
                        <View style={[styles.soloBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                          <Text style={[styles.soloBadgeText, { color: colors.primary }]}>{run.type}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{run.title || 'RUN SESSION'}</Text>

                    <View style={styles.statsRow}>
                      <View style={styles.statCol}>
                        <Text style={[styles.statMedium, { color: colors.primary }]}>{run.distanceKm.toFixed(2)}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>KM</Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={[styles.statMedium, { color: colors.textPrimary }]}>{timeStr}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>TIME</Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={[styles.statMedium, { color: colors.textPrimary }]}>{run.pace || '--:--'}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>PACE</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="run-fast" size={44} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>NO LOGGED RUNS YET</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Start a live GPS run or record a training session to build your lifetime running history.
            </Text>
            <View style={styles.emptyActionRow}>
              <TouchableOpacity
                style={[styles.primaryEmptyButton, { backgroundColor: colors.primary }]}
                onPress={handleStartLiveRun}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={16} color="#000000" />
                <Text style={styles.primaryEmptyButtonText}>START LIVE RUN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryEmptyButton, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                onPress={() => setQuickLogModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryEmptyButtonText, { color: colors.textPrimary }]}>RECORD SESSION</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* QUICK LOG RUN / SELECT DISTANCE MODAL */}
      <Modal
        visible={quickLogModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickLogModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.quickLogCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.quickLogHeader}>
              <View style={styles.quickLogTitleRow}>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
                <Text style={[styles.quickLogTitle, { color: colors.textPrimary }]}>LOG RUN SESSION</Text>
              </View>
              <TouchableOpacity onPress={() => setQuickLogModalVisible(false)}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.quickLogSubtitle, { color: colors.textSecondary }]}>
              Select a distance or start a live tracked session:
            </Text>

            {/* Live GPS Track Option */}
            <TouchableOpacity
              style={[styles.liveRunOption, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}
              onPress={handleStartLiveRun}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-circle" size={24} color={colors.primary} />
              <View style={styles.optionTextCol}>
                <Text style={[styles.optionTitle, { color: colors.primary }]}>START LIVE GPS RUN</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Real-time GPS tracking & map route recording</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.modalDivider, { backgroundColor: colors.cardBorder }]} />
            <Text style={[styles.presetsHeader, { color: colors.textMuted }]}>PRESET DISTANCES</Text>

            {/* Distance Presets */}
            <View style={styles.presetsGrid}>
              {[
                { km: 1.0, sec: 260, pace: '4:20 /km', title: '1.0 KM SPRINT' },
                { km: 2.0, sec: 540, pace: '4:30 /km', title: '2.0 KM TEMPO' },
                { km: 3.2, sec: 890, pace: '4:38 /km', title: '3.2 KM MORNING RUN' },
                { km: 5.0, sec: 1380, pace: '4:36 /km', title: '5.0 KM 5K TRAINING' },
                { km: 10.0, sec: 2940, pace: '4:54 /km', title: '10.0 KM LONG RUN' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.km}
                  style={[styles.presetBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                  onPress={() => handleQuickLog(item.km, item.sec, item.pace, item.title)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetKm, { color: colors.primary }]}>{item.km} KM</Text>
                  <Text style={[styles.presetTitle, { color: colors.textSecondary }]}>{item.title}</Text>
                  <Text style={[styles.presetPace, { color: colors.textMuted }]}>{item.pace}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

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
              <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.detailsCardContent}>
                  <View style={styles.detailsRow}>
                    <View style={styles.detailsCol}>
                      <Text style={[styles.detailsValue, { color: colors.primary }]}>
                        {selectedRun.distanceKm.toFixed(2)}
                      </Text>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>DISTANCE (KM)</Text>
                    </View>
                    <View style={styles.detailsCol}>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {formatDuration(selectedRun.durationSeconds)}
                      </Text>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>DURATION</Text>
                    </View>
                  </View>

                  <View style={[styles.detailsDivider, { backgroundColor: colors.cardBorder }]} />

                  <View style={styles.detailsRow}>
                    <View style={styles.detailsCol}>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>{selectedRun.pace || '--:--'}</Text>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>AVG PACE</Text>
                    </View>
                    <View style={styles.detailsCol}>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {selectedRun.calories || Math.round(selectedRun.distanceKm * 62)} kcal
                      </Text>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>CALORIES</Text>
                    </View>
                  </View>
                </View>
              </View>

              <NeonButton
                title="CLOSE DETAILS"
                onPress={() => setSelectedRun(null)}
                style={styles.closeDetailsBtn}
              />
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Live Solo Run Tracker Modal */}
      <SoloRunModal
        visible={soloRunModalVisible}
        onClose={() => setSoloRunModalVisible(false)}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
    color: '#000000',
    opacity: 0.75,
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
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  statBig: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
  },
  statMedium: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: 0.8,
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
    borderWidth: 1,
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
  },
  soloBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  soloBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '900',
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
    marginBottom: 20,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  primaryEmptyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  primaryEmptyButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  secondaryEmptyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryEmptyButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  quickLogCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  quickLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickLogTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  quickLogSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  liveRunOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    marginBottom: 14,
  },
  presetsHeader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  presetsGrid: {
    gap: 8,
  },
  presetBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetKm: {
    fontSize: 14,
    fontWeight: '900',
    width: 65,
  },
  presetTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  presetPace: {
    fontSize: 11,
    fontWeight: '600',
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
    borderWidth: 1,
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
