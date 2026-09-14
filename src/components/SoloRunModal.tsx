import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSoloRun } from '../context/SoloRunContext';
import { JogpalMap } from './map/JogpalMap';
import { OfflineSyntheticMap } from './map/OfflineSyntheticMap';
import { NeonButton } from './NeonButton';
import { NeonCard } from './NeonCard';
import { useTheme } from '../context/ThemeContext';
import { OfflineRouteMode } from '../types/soloRun';

interface SoloRunModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SoloRunModal: React.FC<SoloRunModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    runState,
    metrics,
    currentLocation,
    actualRoute,
    plannedRoute,
    countdownValue,
    lastRunSummary,
    activeRunTitle,
    errorMessage,
    offlineConfig,
    activePartner,
    partnerRunner,
    startPreparation,
    startOfflinePreparation,
    startCountdown,
    pauseRun,
    resumeRun,
    finishRun,
    saveRun,
    cancelRun,
    resetState,
  } = useSoloRun();

  // Setup options for Offline Target Mode
  const [modeTab, setModeTab] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [selectedTargetKm, setSelectedTargetKm] = useState<number>(5);
  const [selectedRouteMode, setSelectedRouteMode] = useState<OfflineRouteMode>('LOOP');

  if (!visible) return null;

  const handleClose = () => {
    if (runState === 'ACTIVE' || runState === 'PAUSED' || runState === 'COUNTDOWN') {
      Alert.alert(
        'Exit Run',
        'Are you sure you want to exit? Your active run will be discarded.',
        [
          { text: 'Keep Running', style: 'cancel' },
          {
            text: 'Exit & Discard',
            style: 'destructive',
            onPress: () => {
              cancelRun();
              onClose();
            },
          },
        ]
      );
    } else {
      resetState();
      onClose();
    }
  };

  const handleStartRunPress = async () => {
    if (modeTab === 'OFFLINE') {
      await startOfflinePreparation(selectedTargetKm, selectedRouteMode);
      startCountdown();
    } else {
      startCountdown();
    }
  };

  const handleSaveAndDone = async () => {
    await saveRun();
  };

  const handleFinishDone = () => {
    resetState();
    onClose();
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

  const formatDistanceDisplay = (distKm: number): { value: string; unit: string } => {
    if (distKm < 1.0) {
      const meters = Math.round(distKm * 1000);
      return { value: `${meters}`, unit: 'METERS' };
    }
    return { value: distKm.toFixed(2), unit: 'KILOMETERS' };
  };

  const isCurrentRunOffline = offlineConfig?.isOfflineMode || modeTab === 'OFFLINE';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.rootContainer, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
        {/* Header Bar */}
        <View style={[styles.headerBar, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
            <Feather name="x" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {activeRunTitle || 'SOLO RUN'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* --- STATE 1: ERROR --- */}
        {runState === 'ERROR' && (
          <View style={styles.centeredContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF4D4D" />
            </View>
            <Text style={styles.errorTitle}>LOCATION ERROR</Text>
            <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
              {errorMessage || 'Unable to access location services on this device.'}
            </Text>
            <NeonButton title="CLOSE" onPress={handleClose} style={styles.actionBtn} />
          </View>
        )}

        {/* --- STATE 2: PREPARING & GPS SEARCHING --- */}
        {(runState === 'PREPARING' || runState === 'GPS_SEARCHING') && (
          <View style={styles.centeredContainer}>
            <View style={[styles.glowContainer, { borderColor: colors.primary, backgroundColor: colors.crewAddBg }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>SATELLITE LOCK</Text>
            <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>ESTABLISHING HARDWARE TRACKING SIGNAL...</Text>
            <Text style={[styles.statusLabel, { color: colors.primary }]}>
              STATUS: {metrics.gpsStatus.toUpperCase()}
            </Text>
            <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
              <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>CANCEL PREPARATION</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- STATE 3: GPS READY / SETUP MODE --- */}
        {runState === 'GPS_READY' && (
          <View style={styles.centeredContainer}>
            <View style={styles.readyBadge}>
              <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>TRACKING READY</Text>

            {/* Run Mode Selector: ONLINE MAP vs OFFLINE TARGET */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, modeTab === 'ONLINE' && { backgroundColor: colors.primary }]}
                onPress={() => setModeTab('ONLINE')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, { color: modeTab === 'ONLINE' ? '#000000' : colors.textSecondary }]}>
                  ONLINE MAP
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, modeTab === 'OFFLINE' && { backgroundColor: colors.primary }]}
                onPress={() => setModeTab('OFFLINE')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, { color: modeTab === 'OFFLINE' ? '#000000' : colors.textSecondary }]}>
                  OFFLINE TARGET
                </Text>
              </TouchableOpacity>
            </View>

            {/* OFFLINE SETUP CONTROLS */}
            {modeTab === 'OFFLINE' && (
              <View style={styles.offlineSetupContainer}>
                {/* Distance Selector */}
                <Text style={[styles.setupLabel, { color: colors.textSecondary }]}>TARGET DISTANCE:</Text>
                <View style={styles.chipRow}>
                  {[1, 2, 3, 5, 10].map((km) => (
                    <TouchableOpacity
                      key={km}
                      style={[
                        styles.chipBtn,
                        { borderColor: colors.cardBorder },
                        selectedTargetKm === km && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setSelectedTargetKm(km)}
                    >
                      <Text style={[styles.chipText, { color: selectedTargetKm === km ? '#000' : colors.textPrimary }]}>
                        {km} KM
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Route Mode Selector (LOOP vs STRAIGHT) */}
                <Text style={[styles.setupLabel, { color: colors.textSecondary }]}>ROUTE MODE:</Text>
                <View style={styles.chipRow}>
                  {(['LOOP', 'STRAIGHT'] as OfflineRouteMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.routeModeBtn,
                        { borderColor: colors.cardBorder },
                        selectedRouteMode === mode && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setSelectedRouteMode(mode)}
                    >
                      <Ionicons
                        name={mode === 'LOOP' ? 'refresh-circle' : 'arrow-forward-circle'}
                        size={16}
                        color={selectedRouteMode === mode ? '#000' : colors.textPrimary}
                      />
                      <Text style={[styles.chipText, { color: selectedRouteMode === mode ? '#000' : colors.textPrimary }]}>
                        {mode === 'LOOP' ? 'LOOP (CIRCUIT)' : 'STRAIGHT (RUNWAY)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Offline Synthetic Map Preview */}
                <OfflineSyntheticMap
                  currentDistanceKm={0}
                  targetDistanceKm={selectedTargetKm}
                  routeMode={selectedRouteMode}
                  style={styles.previewMap}
                />
              </View>
            )}

            {/* ONLINE MAP PREVIEW */}
            {modeTab === 'ONLINE' && (
              <JogpalMap
                currentLocation={currentLocation}
                actualRoute={actualRoute}
                plannedRoute={plannedRoute}
                partnerRunners={partnerRunner ? [partnerRunner] : []}
                style={styles.previewMap}
                interactive={false}
              />
            )}

            <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary }]} onPress={handleStartRunPress} activeOpacity={0.85}>
              <Text style={styles.startRunText}>
                {modeTab === 'OFFLINE' ? `START ${selectedTargetKm}KM ${selectedRouteMode} RUN` : 'START RUN'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- STATE 4: COUNTDOWN --- */}
        {runState === 'COUNTDOWN' && (
          <View style={styles.centeredContainer}>
            <Text style={[styles.countdownTitle, { color: colors.textSecondary }]}>GET READY</Text>
            <Text style={[styles.countdownNumber, { color: colors.primary }]}>{countdownValue}</Text>
          </View>
        )}

        {/* --- STATE 5: ACTIVE LIVE RUN --- */}
        {runState === 'ACTIVE' && (
          <View style={styles.activeContainer}>
            {/* Top Stat: Distance */}
            <View style={styles.distanceBlock}>
              <Text style={[styles.distanceNumber, { color: colors.textPrimary }]}>
                {formatDistanceDisplay(metrics.distanceKm).value}
              </Text>
              <Text style={[styles.distanceUnit, { color: colors.primary }]}>
                {formatDistanceDisplay(metrics.distanceKm).unit}
              </Text>
            </View>

            {/* Active Partner Pill Indicator */}
            {activePartner && (
              <View
                style={[
                  styles.partnerActivePill,
                  {
                    backgroundColor: colors.crewAddBg,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={[styles.partnerActivePillText, { color: colors.textPrimary }]}>
                  DUO PARTNER:{' '}
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {activePartner.name.toUpperCase()}
                  </Text>
                </Text>
              </View>
            )}

            {/* Map Component (Offline Synthetic Map OR Live Street Map) */}
            {offlineConfig?.isOfflineMode ? (
              <OfflineSyntheticMap
                currentDistanceKm={metrics.distanceKm}
                targetDistanceKm={offlineConfig.targetDistanceKm}
                routeMode={offlineConfig.routeMode}
                style={styles.liveMap}
              />
            ) : (
              <JogpalMap
                currentLocation={currentLocation}
                actualRoute={actualRoute}
                plannedRoute={plannedRoute}
                partnerRunners={partnerRunner ? [partnerRunner] : []}
                style={styles.liveMap}
                interactive={true}
              />
            )}

            {/* Telemetry Grid Card */}
            <NeonCard style={styles.telemetryCard} contentStyle={styles.telemetryContent}>
              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{formatDuration(metrics.durationSeconds)}</Text>
                  <Text style={styles.telemetryLabel}>TIME</Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{metrics.currentPace}</Text>
                  <Text style={styles.telemetryLabel}>PACE</Text>
                </View>
              </View>

              <View style={styles.horizontalDivider} />

              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>
                    {metrics.currentSpeedKmH !== null ? `${metrics.currentSpeedKmH}` : '0.0'}
                  </Text>
                  <Text style={styles.telemetryLabel}>SPEED (KM/H)</Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{metrics.gpsStatus}</Text>
                  <Text style={styles.telemetryLabel}>GPS STATUS</Text>
                </View>
              </View>
            </NeonCard>

            {/* Control Button: Pause */}
            <TouchableOpacity style={[styles.pauseButton, { backgroundColor: colors.primary }]} onPress={pauseRun} activeOpacity={0.85}>
              <Ionicons name="pause" size={24} color="#000000" />
              <Text style={styles.pauseButtonText}>PAUSE RUN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- STATE 6: PAUSED RUN --- */}
        {runState === 'PAUSED' && (
          <View style={styles.activeContainer}>
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedBadgeText}>RUN PAUSED</Text>
            </View>

            <View style={styles.distanceBlock}>
              <Text style={[styles.distanceNumber, { color: colors.textPrimary }]}>
                {formatDistanceDisplay(metrics.distanceKm).value}
              </Text>
              <Text style={[styles.distanceUnit, { color: colors.primary }]}>
                {formatDistanceDisplay(metrics.distanceKm).unit}
              </Text>
            </View>

            {offlineConfig?.isOfflineMode ? (
              <OfflineSyntheticMap
                currentDistanceKm={metrics.distanceKm}
                targetDistanceKm={offlineConfig.targetDistanceKm}
                routeMode={offlineConfig.routeMode}
                style={styles.liveMap}
              />
            ) : (
              <JogpalMap
                currentLocation={currentLocation}
                actualRoute={actualRoute}
                plannedRoute={plannedRoute}
                style={styles.liveMap}
                interactive={true}
              />
            )}

            <NeonCard style={styles.telemetryCard} contentStyle={styles.telemetryContent}>
              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{formatDuration(metrics.durationSeconds)}</Text>
                  <Text style={styles.telemetryLabel}>TIME</Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{metrics.avgPace}</Text>
                  <Text style={styles.telemetryLabel}>AVG PACE</Text>
                </View>
              </View>
            </NeonCard>

            <View style={styles.pausedControlsRow}>
              <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: colors.primary }]} onPress={resumeRun} activeOpacity={0.85}>
                <Ionicons name="play" size={20} color="#000000" />
                <Text style={styles.resumeBtnText}>RESUME</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.finishBtn} onPress={finishRun} activeOpacity={0.85}>
                <Ionicons name="stop" size={20} color="#FFFFFF" />
                <Text style={styles.finishBtnText}>FINISH</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- STATE 7: COMPLETING & SUMMARY --- */}
        {(runState === 'COMPLETING' || runState === 'SAVING' || runState === 'SAVED' || runState === 'SYNC_PENDING') && lastRunSummary && (
          <View style={styles.activeContainer}>
            <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>RUN SUMMARY</Text>
            <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>GREAT WORK! SESSION COMPLETED</Text>

            {/* Completed Route Map View */}
            {offlineConfig?.isOfflineMode ? (
              <OfflineSyntheticMap
                currentDistanceKm={lastRunSummary.distanceKm}
                targetDistanceKm={offlineConfig.targetDistanceKm}
                routeMode={offlineConfig.routeMode}
                style={styles.summaryMap}
              />
            ) : (
              <JogpalMap
                actualRoute={lastRunSummary.actualRoute || actualRoute}
                plannedRoute={lastRunSummary.plannedRoute || plannedRoute}
                style={styles.summaryMap}
                interactive={true}
                showStartFinishMarkers={true}
                fitRouteOnLoad={true}
              />
            )}

            <NeonCard style={styles.summaryCard} contentStyle={styles.summaryContent}>
              <View style={styles.summaryTopRow}>
                <Text style={styles.summaryTitle}>
                  {offlineConfig?.isOfflineMode ? `OFFLINE ${offlineConfig.targetDistanceKm}KM RUN` : 'SOLO RUN'}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                    {runState === 'SAVED' ? 'SYNCED TO FIREBASE' : runState === 'SYNC_PENDING' ? 'SAVED LOCALLY' : 'COMPLETE'}
                  </Text>
                </View>
              </View>

              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{formatDistanceDisplay(lastRunSummary.distanceKm).value}</Text>
                  <Text style={styles.telemetryLabel}>{formatDistanceDisplay(lastRunSummary.distanceKm).unit}</Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{formatDuration(lastRunSummary.durationSeconds)}</Text>
                  <Text style={styles.telemetryLabel}>TIME</Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryCol}>
                  <Text style={styles.telemetryValue}>{lastRunSummary.pace}</Text>
                  <Text style={styles.telemetryLabel}>PACE</Text>
                </View>
              </View>
            </NeonCard>

            {runState === 'COMPLETING' && (
              <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary }]} onPress={handleSaveAndDone} activeOpacity={0.85}>
                <Text style={styles.startRunText}>SAVE RUN</Text>
              </TouchableOpacity>
            )}

            {runState === 'SAVING' && (
              <View style={styles.centeredRow}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.savingText, { color: colors.primary }]}>SAVING LOCALLY / FIREBASE...</Text>
              </View>
            )}

            {(runState === 'SAVED' || runState === 'SYNC_PENDING') && (
              <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary }]} onPress={handleFinishDone} activeOpacity={0.85}>
                <Text style={styles.startRunText}>DONE</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  glowContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  readyBadge: {
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#16161D',
    borderRadius: 20,
    padding: 3,
    marginVertical: 10,
    width: '100%',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 17,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  offlineSetupContainer: {
    width: '100%',
    marginVertical: 4,
  },
  setupLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  routeModeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  previewMap: {
    height: 180,
    width: '100%',
    marginVertical: 8,
  },
  liveMap: {
    height: 260,
    width: '100%',
    marginVertical: 10,
  },
  summaryMap: {
    height: 160,
    width: '100%',
    marginVertical: 10,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
  },
  startRunButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  startRunText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cancelLink: {
    paddingVertical: 10,
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  countdownTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: '900',
    lineHeight: 130,
  },
  activeContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  distanceBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  distanceNumber: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 68,
  },
  distanceUnit: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  telemetryCard: {
    borderRadius: 20,
  },
  telemetryContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  telemetryCol: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginVertical: 8,
  },
  pauseButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pauseButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
  },
  pausedBadge: {
    alignSelf: 'center',
    backgroundColor: '#332900',
    borderColor: '#FFD700',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pausedBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pausedControlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resumeBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  resumeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  finishBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#CC2B2B',
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  summaryCard: {
    borderRadius: 20,
    marginVertical: 8,
  },
  summaryContent: {
    padding: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: '#050505',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  centeredRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  savingText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF4D4D',
    letterSpacing: 1,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  actionBtn: {
    width: '100%',
  },
  partnerActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: -8,
    marginBottom: 10,
  },
  partnerActivePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
