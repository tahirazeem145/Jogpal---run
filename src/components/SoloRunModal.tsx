import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSoloRun } from '../context/SoloRunContext';
import { JogpalMap } from './map/JogpalMap';
import { OfflineSyntheticMap } from './map/OfflineSyntheticMap';
import { NeonButton } from './NeonButton';
import { NeonCard } from './NeonCard';
import { useTheme } from '../context/ThemeContext';
import { OfflineRouteMode, RunSubtype } from '../types/soloRun';

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
    partnerRunners,
    countdownValue,
    lastRunSummary,
    activeRunTitle,
    activeRunSubtype,
    errorMessage,
    offlineConfig,
    activePartner,
    partnerRunner,
    duoSessionId,
    duoSession,
    groupSessionId,
    groupSession,
    isDuoWaitingForPartner,
    isGroupWaitingForPartners,
    groupAcceptedCount,
    groupTotalInvitedCount,
    startPreparation,
    startDuoPreparation,
    startGroupPreparation,
    startOfflinePreparation,
    startCountdown,
    pauseRun,
    resumeRun,
    finishRun,
    saveRun,
    cancelRun,
    resetState,
  } = useSoloRun();

  // Unified Run Modes (SOLO, DUO, GROUP, OFFLINE)
  const [selectedMode, setSelectedMode] = useState<RunSubtype>(activeRunSubtype || 'SOLO');
  const [selectedTargetKm, setSelectedTargetKm] = useState<number>(5);
  const [selectedRouteMode, setSelectedRouteMode] = useState<OfflineRouteMode>('LOOP');
  const [isFullScreenMap, setIsFullScreenMap] = useState<boolean>(false);

  React.useEffect(() => {
    if (activeRunSubtype) {
      setSelectedMode(activeRunSubtype);
    }
  }, [activeRunSubtype]);

  if (!visible) return null;

  const handleSelectMode = async (mode: RunSubtype) => {
    setSelectedMode(mode);
    if (mode === 'SOLO') {
      await startPreparation('SOLO RUN', 'SOLO');
    } else if (mode === 'DUO') {
      await startDuoPreparation('Alex');
    } else if (mode === 'GROUP') {
      await startGroupPreparation('GROUP SQUAD RUN', ['Alex', 'Sam', 'Jordan']);
    } else if (mode === 'OFFLINE') {
      await startOfflinePreparation(selectedTargetKm, selectedRouteMode);
    }
  };

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
              setIsFullScreenMap(false);
              cancelRun();
              onClose();
            },
          },
        ]
      );
    } else {
      setIsFullScreenMap(false);
      resetState();
      onClose();
    }
  };

  const handleStartRunPress = async () => {
    if (selectedMode === 'OFFLINE') {
      await startOfflinePreparation(selectedTargetKm, selectedRouteMode);
    }
    startCountdown();
  };

  const handleSaveAndDone = async () => {
    setIsFullScreenMap(false);
    await saveRun();
  };

  const handleFinishDone = () => {
    setIsFullScreenMap(false);
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

  const isCurrentRunOffline = offlineConfig?.isOfflineMode || selectedMode === 'OFFLINE';
  const effectivePartnerRunners = partnerRunners.length > 0 ? partnerRunners : (partnerRunner ? [partnerRunner] : []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.rootContainer, { paddingTop: isFullScreenMap ? 0 : insets.top, paddingBottom: isFullScreenMap ? 0 : insets.bottom, backgroundColor: colors.background }]}>
        {/* Header Bar */}
        {!isFullScreenMap && (
          <View style={[styles.headerBar, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {activeRunTitle || 'SOLO RUN'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        )}

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

        {/* --- STATE: WAITING FOR SQUAD PARTICIPANTS --- */}
        {isGroupWaitingForPartners && groupSession && (
          <View style={styles.centeredContainer}>
            <View style={[styles.glowContainer, { borderColor: colors.primary, backgroundColor: colors.crewAddBg }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>SQUAD INVITATIONS SENT</Text>
            <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>
              WAITING FOR SQUAD MEMBERS TO ACCEPT ({groupAcceptedCount}/{groupTotalInvitedCount} ACCEPTED)...
            </Text>

            {/* Invited friends status list */}
            <View style={[styles.squadStatusContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
              {Object.values(groupSession.invitedFriends || {}).map((friend) => (
                <View key={friend.userId} style={styles.squadFriendRow}>
                  <Text style={[styles.squadFriendName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: friend.status === 'ACCEPTED' ? colors.accentSubtle : 'rgba(255,255,255,0.06)' }]}>
                    <Text style={[styles.statusBadgeText, { color: friend.status === 'ACCEPTED' ? colors.primary : colors.textMuted }]}>
                      {friend.status === 'ACCEPTED' ? 'ACCEPTED ⚡' : 'INVITED ⏳'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={[styles.statusLabel, { color: colors.primary }]}>
              ⚡ LIVE GPS MAP WILL LAUNCH AUTOMATICALLY AS RUNNERS ACCEPT
            </Text>

            <TouchableOpacity
              style={[styles.forceStartBtn, { backgroundColor: colors.primary }]}
              onPress={() => startCountdown()}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={16} color="#000000" />
              <Text style={styles.forceStartBtnText}>START RUN NOW</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
              <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>CANCEL SQUAD SESSION</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- STATE: WAITING FOR DUO PARTNER --- */}
        {!isGroupWaitingForPartners && isDuoWaitingForPartner && activePartner && (
          <View style={styles.centeredContainer}>
            <View style={[styles.glowContainer, { borderColor: colors.primary, backgroundColor: colors.crewAddBg }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>INVITATION SENT</Text>
            <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>
              WAITING FOR <Text style={{ color: colors.primary, fontWeight: '800' }}>{activePartner.name.toUpperCase()}</Text> TO ACCEPT ON THEIR PHONE...
            </Text>
            <Text style={[styles.statusLabel, { color: colors.primary }]}>
              ⚡ LIVE GPS MAP WILL LAUNCH AUTOMATICALLY
            </Text>
            <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
              <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>CANCEL INVITATION</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- STATE 2: PREPARING & GPS SEARCHING --- */}
        {!isGroupWaitingForPartners && !isDuoWaitingForPartner && (runState === 'PREPARING' || runState === 'GPS_SEARCHING') && (
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
        {!isGroupWaitingForPartners && !isDuoWaitingForPartner && runState === 'GPS_READY' && (
          isFullScreenMap ? (
            <View style={StyleSheet.absoluteFill}>
              {/* Fullscreen Preview Map */}
              {selectedMode === 'OFFLINE' ? (
                <OfflineSyntheticMap
                  currentDistanceKm={0}
                  targetDistanceKm={selectedTargetKm}
                  routeMode={selectedRouteMode}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <JogpalMap
                  currentLocation={currentLocation}
                  actualRoute={actualRoute}
                  plannedRoute={plannedRoute}
                  partnerRunners={effectivePartnerRunners}
                  style={StyleSheet.absoluteFill}
                  interactive={true}
                />
              )}

              {/* TOP HUD */}
              <View style={[styles.fullScreenTopHud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
                <View style={styles.fullScreenTopRow}>
                  <TouchableOpacity
                    style={[styles.fullScreenCollapseBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.cardBorder }]}
                    onPress={() => setIsFullScreenMap(false)}
                    activeOpacity={0.85}
                  >
                    <Feather name="minimize-2" size={14} color={colors.primary} />
                    <Text style={[styles.fullScreenCollapseText, { color: colors.textPrimary }]}>COLLAPSE</Text>
                  </TouchableOpacity>

                  <View style={[styles.fullScreenGpsBadge, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.cardBorder }]}>
                    <View style={[styles.gpsDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.fullScreenGpsText, { color: colors.textSecondary }]}>READY</Text>
                  </View>
                </View>

                {/* Floating Mode Chips Row */}
                <View style={[styles.modeChipsRow, { backgroundColor: 'rgba(14, 14, 20, 0.92)', padding: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }]}>
                  {(
                    [
                      { key: 'SOLO', label: 'SOLO', icon: 'flash' },
                      { key: 'DUO', label: 'DUO', icon: 'people' },
                      { key: 'GROUP', label: 'SQUAD', icon: 'globe-outline' },
                      { key: 'OFFLINE', label: 'OFFLINE', icon: 'flag' },
                    ] as const
                  ).map((tab) => {
                    const isActive = selectedMode === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[
                          styles.modeChip,
                          { borderColor: colors.cardBorder },
                          isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => handleSelectMode(tab.key)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={tab.icon as any}
                          size={13}
                          color={isActive ? '#000000' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.modeChipText,
                            { color: isActive ? '#000000' : colors.textSecondary },
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* BOTTOM HUD */}
              <View style={[styles.fullScreenBottomHud, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
                {/* Offline target chips in full screen */}
                {selectedMode === 'OFFLINE' && (
                  <View style={[styles.offlineSetupContainer, { backgroundColor: 'rgba(14, 14, 20, 0.92)', padding: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 8 }]}>
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
                            {mode === 'LOOP' ? 'LOOP' : 'STRAIGHT'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary }]} onPress={handleStartRunPress} activeOpacity={0.85}>
                  <Text style={styles.startRunText}>
                    {selectedMode === 'OFFLINE'
                      ? `START ${selectedTargetKm}KM ${selectedRouteMode} RUN`
                      : selectedMode === 'DUO'
                      ? 'START DUO RUN'
                      : selectedMode === 'GROUP'
                      ? 'START SQUAD RUN'
                      : 'START SOLO RUN'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.centeredContainer}>
              <View style={styles.readyBadge}>
                <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>TRACKING READY</Text>

              {/* Unified 4-Mode Selector Chips */}
              <View style={styles.modeChipsRow}>
                {(
                  [
                    { key: 'SOLO', label: 'SOLO', icon: 'flash' },
                    { key: 'DUO', label: 'DUO', icon: 'people' },
                    { key: 'GROUP', label: 'SQUAD', icon: 'globe-outline' },
                    { key: 'OFFLINE', label: 'OFFLINE', icon: 'flag' },
                  ] as const
                ).map((tab) => {
                  const isActive = selectedMode === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.modeChip,
                        { borderColor: colors.cardBorder },
                        isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => handleSelectMode(tab.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={tab.icon as any}
                        size={13}
                        color={isActive ? '#000000' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.modeChipText,
                          { color: isActive ? '#000000' : colors.textSecondary },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Mode-Specific Information Banner */}
              {selectedMode === 'SOLO' && (
                <View style={[styles.modeInfoPill, { borderColor: colors.cardBorder }]}>
                  <Ionicons name="flash" size={12} color={colors.primary} />
                  <Text style={[styles.modeInfoText, { color: colors.textSecondary }]}>
                    SOLO TRACKING • 2D Kalman Precision Active
                  </Text>
                </View>
              )}

              {selectedMode === 'DUO' && (
                <View style={[styles.modeInfoPill, { borderColor: colors.primary }]}>
                  <Ionicons name="people" size={13} color={colors.primary} />
                  <Text style={[styles.modeInfoText, { color: colors.textPrimary }]}>
                    DUO SYNC: Pacing with <Text style={{ color: colors.primary, fontWeight: '800' }}>Alex</Text> (~8m sync)
                  </Text>
                </View>
              )}

              {selectedMode === 'GROUP' && (
                <View style={[styles.modeInfoPill, { borderColor: colors.primary }]}>
                  <Ionicons name="globe-outline" size={13} color={colors.primary} />
                  <Text style={[styles.modeInfoText, { color: colors.textPrimary }]}>
                    SQUAD CREW: <Text style={{ color: colors.primary, fontWeight: '800' }}>Alex, Sam, Jordan</Text> (Formation Sync)
                  </Text>
                </View>
              )}

              {/* OFFLINE SETUP CONTROLS */}
              {selectedMode === 'OFFLINE' && (
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
                  <View style={styles.previewMapWrapper}>
                    <OfflineSyntheticMap
                      currentDistanceKm={0}
                      targetDistanceKm={selectedTargetKm}
                      routeMode={selectedRouteMode}
                      style={styles.liveMapFill}
                    />
                    <TouchableOpacity
                      style={[
                        styles.expandMapButton,
                        {
                          backgroundColor: 'rgba(12, 12, 18, 0.9)',
                          borderColor: colors.cardBorder,
                        },
                      ]}
                      onPress={() => setIsFullScreenMap(true)}
                      activeOpacity={0.85}
                      accessibilityLabel="Full Screen Map"
                    >
                      <Feather name="maximize-2" size={13} color={colors.primary} />
                      <Text style={[styles.expandMapText, { color: colors.primary }]}>FULL MAP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* LIVE SATELLITE MAP PREVIEW FOR ONLINE MODES */}
              {selectedMode !== 'OFFLINE' && (
                <View style={styles.previewMapWrapper}>
                  <JogpalMap
                    currentLocation={currentLocation}
                    actualRoute={actualRoute}
                    plannedRoute={plannedRoute}
                    partnerRunners={effectivePartnerRunners}
                    style={styles.liveMapFill}
                    interactive={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.expandMapButton,
                      {
                        backgroundColor: 'rgba(12, 12, 18, 0.9)',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => setIsFullScreenMap(true)}
                    activeOpacity={0.85}
                    accessibilityLabel="Full Screen Map"
                  >
                    <Feather name="maximize-2" size={13} color={colors.primary} />
                    <Text style={[styles.expandMapText, { color: colors.primary }]}>FULL MAP</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary }]} onPress={handleStartRunPress} activeOpacity={0.85}>
                <Text style={styles.startRunText}>
                  {selectedMode === 'OFFLINE'
                    ? `START ${selectedTargetKm}KM ${selectedRouteMode} RUN`
                    : selectedMode === 'DUO'
                    ? 'START DUO RUN'
                    : selectedMode === 'GROUP'
                    ? 'START SQUAD RUN'
                    : 'START SOLO RUN'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* --- UNIFIED LIVE RUN SESSION (COUNTDOWN, ACTIVE, PAUSED) --- */}
        {(runState === 'COUNTDOWN' || runState === 'ACTIVE' || runState === 'PAUSED') && (
          isFullScreenMap ? (
            <View style={StyleSheet.absoluteFill}>
              {/* Edge-to-Edge Fullscreen Map */}
              {offlineConfig?.isOfflineMode ? (
                <OfflineSyntheticMap
                  currentDistanceKm={metrics.distanceKm}
                  targetDistanceKm={offlineConfig.targetDistanceKm}
                  routeMode={offlineConfig.routeMode}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <JogpalMap
                  currentLocation={currentLocation}
                  actualRoute={actualRoute}
                  plannedRoute={plannedRoute}
                  partnerRunners={effectivePartnerRunners}
                  style={StyleSheet.absoluteFill}
                  interactive={runState !== 'COUNTDOWN'}
                />
              )}

              {/* Seamless Countdown Overlay on Top of Initialized Map */}
              {runState === 'COUNTDOWN' && (
                <View style={styles.countdownOverlay}>
                  <Text style={[styles.countdownTitle, { color: colors.textSecondary }]}>GET READY</Text>
                  <Text style={[styles.countdownNumber, { color: colors.primary }]}>{countdownValue}</Text>
                </View>
              )}

              {/* TOP FLOATING HUD OVERLAY */}
              <View style={[styles.fullScreenTopHud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
                {/* Top Action & Mode Row */}
                <View style={styles.fullScreenTopRow}>
                  {/* Collapse / Back to Standard View */}
                  <TouchableOpacity
                    style={[styles.fullScreenCollapseBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.cardBorder }]}
                    onPress={() => setIsFullScreenMap(false)}
                    activeOpacity={0.85}
                  >
                    <Feather name="minimize-2" size={14} color={colors.primary} />
                    <Text style={[styles.fullScreenCollapseText, { color: colors.textPrimary }]}>COLLAPSE</Text>
                  </TouchableOpacity>

                  {/* Mode Badge */}
                  <View style={[styles.fullScreenModeBadge, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.primary }]}>
                    <Ionicons
                      name={
                        activeRunSubtype === 'DUO'
                          ? 'people'
                          : activeRunSubtype === 'GROUP'
                          ? 'globe-outline'
                          : activeRunSubtype === 'OFFLINE'
                          ? 'flag'
                          : 'flash'
                      }
                      size={13}
                      color={colors.primary}
                    />
                    <Text style={[styles.fullScreenModeText, { color: colors.primary }]}>
                      {activeRunSubtype || selectedMode}
                    </Text>
                  </View>

                  {/* GPS Status Indicator */}
                  <View style={[styles.fullScreenGpsBadge, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.cardBorder }]}>
                    <View style={[styles.gpsDot, { backgroundColor: (metrics.gpsStatus === 'GOOD' || metrics.gpsStatus === 'READY') ? colors.primary : '#FFB800' }]} />
                    <Text style={[styles.fullScreenGpsText, { color: colors.textSecondary }]}>
                      {metrics.gpsStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Paused HUD Alert Banner */}
                {runState === 'PAUSED' && (
                  <View style={styles.fullScreenPausedBadge}>
                    <Ionicons name="pause" size={12} color="#FFD700" />
                    <Text style={styles.pausedBadgeText}>RUN PAUSED</Text>
                  </View>
                )}

                {/* Floating Hero Distance Card */}
                <View style={[styles.fullScreenHeroDistanceCard, { backgroundColor: 'rgba(12, 12, 18, 0.92)', borderColor: colors.cardBorder }]}>
                  <View style={styles.fullScreenDistanceRow}>
                    <Text style={[styles.fullScreenDistanceNumber, { color: colors.textPrimary }]}>
                      {formatDistanceDisplay(metrics.distanceKm).value}
                    </Text>
                    <Text style={[styles.fullScreenDistanceUnit, { color: colors.primary }]}>
                      {formatDistanceDisplay(metrics.distanceKm).unit}
                    </Text>
                  </View>

                  {/* OFFLINE Target Progress in Fullscreen */}
                  {offlineConfig?.isOfflineMode && offlineConfig.targetDistanceKm && (
                    <View
                      style={[
                        styles.targetBadge,
                        metrics.distanceKm >= offlineConfig.targetDistanceKm && styles.targetBadgeAchieved,
                        { marginTop: 4 },
                      ]}
                    >
                      <Text style={styles.targetBadgeText}>
                        {metrics.distanceKm >= offlineConfig.targetDistanceKm
                          ? `🎉 TARGET COMPLETED (${metrics.distanceKm.toFixed(2)} / ${offlineConfig.targetDistanceKm} KM)`
                          : `TARGET: ${metrics.distanceKm.toFixed(2)} / ${offlineConfig.targetDistanceKm} KM (${Math.min(
                              100,
                              Math.round((metrics.distanceKm / (offlineConfig.targetDistanceKm || 1)) * 100)
                            )}%)`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Squad Active Bar in Fullscreen */}
                {groupSession && (
                  <View style={[styles.fullScreenSquadBar, { backgroundColor: 'rgba(14, 14, 20, 0.94)', borderColor: colors.cardBorder }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squadScroll}>
                      <View style={[styles.runnerPill, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                        <Text style={[styles.runnerPillName, { color: colors.primary }]}>YOU</Text>
                        <Text style={[styles.runnerPillDist, { color: colors.textPrimary }]}>{metrics.distanceKm.toFixed(2)} km</Text>
                      </View>
                      {effectivePartnerRunners.map((runner) => (
                        <View key={runner.id} style={[styles.runnerPill, { backgroundColor: 'rgba(25, 25, 35, 0.9)', borderColor: colors.cardBorder }]}>
                          <Text style={[styles.runnerPillName, { color: colors.textPrimary }]} numberOfLines={1}>{runner.name.split(' ')[0]}</Text>
                          <Text style={[styles.runnerPillDist, { color: colors.primary }]}>
                            {runner.distanceMeters !== undefined ? `${(runner.distanceMeters / 1000).toFixed(2)} km` : '0.00 km'}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Duo Active Pill in Fullscreen */}
                {!groupSession && activePartner && (
                  <View style={[styles.partnerActivePill, { backgroundColor: 'rgba(14, 14, 20, 0.94)', borderColor: colors.primary, marginTop: 4 }]}>
                    <Ionicons name="people" size={13} color={colors.primary} />
                    <Text style={[styles.partnerActivePillText, { color: colors.textPrimary }]}>
                      DUO: <Text style={{ color: colors.primary, fontWeight: '800' }}>{activePartner.name.toUpperCase()}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* BOTTOM FLOATING HUD OVERLAY */}
              <View style={[styles.fullScreenBottomHud, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
                {/* Floating Translucent Telemetry Card */}
                <View style={[styles.fullScreenTelemetryCard, { backgroundColor: 'rgba(12, 12, 18, 0.94)', borderColor: colors.cardBorder }]}>
                  <View style={styles.telemetryRow}>
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>{formatDuration(metrics.durationSeconds)}</Text>
                      <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>TIME</Text>
                    </View>
                    <View style={[styles.telemetryDivider, { backgroundColor: colors.cardBorder }]} />
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>
                        {runState === 'PAUSED' ? metrics.avgPace : metrics.currentPace}
                      </Text>
                      <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>
                        {runState === 'PAUSED' ? 'AVG PACE' : 'PACE'}
                      </Text>
                    </View>
                    <View style={[styles.telemetryDivider, { backgroundColor: colors.cardBorder }]} />
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>
                        {metrics.currentSpeedKmH !== null ? `${metrics.currentSpeedKmH}` : '0.0'}
                      </Text>
                      <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>KM/H</Text>
                    </View>
                  </View>
                </View>

                {/* Floating Dynamic Run Controls */}
                {runState === 'ACTIVE' && (
                  <TouchableOpacity
                    style={[styles.pauseButton, { backgroundColor: colors.primary, marginTop: 10 }]}
                    onPress={pauseRun}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="pause" size={22} color="#000000" />
                    <Text style={styles.pauseButtonText}>PAUSE RUN</Text>
                  </TouchableOpacity>
                )}

                {runState === 'PAUSED' && (
                  <View style={[styles.pausedControlsRow, { marginTop: 10 }]}>
                    <TouchableOpacity
                      style={[styles.resumeBtn, { backgroundColor: colors.primary }]}
                      onPress={resumeRun}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="play" size={20} color="#000000" />
                      <Text style={styles.resumeBtnText}>RESUME</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.finishBtn}
                      onPress={finishRun}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="stop" size={20} color="#FFFFFF" />
                      <Text style={styles.finishBtnText}>FINISH</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {runState === 'COUNTDOWN' && (
                  <View style={[styles.pauseButton, { backgroundColor: '#1A1A22', opacity: 0.7, marginTop: 10 }]}>
                    <Text style={[styles.pauseButtonText, { color: colors.textSecondary }]}>STARTING SESSION...</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.activeContainer}>
              {/* Paused Badge */}
              {runState === 'PAUSED' && (
                <View style={styles.pausedBadge}>
                  <Text style={styles.pausedBadgeText}>RUN PAUSED</Text>
                </View>
              )}

              {/* Active Mode HUD Banner */}
              <View style={[styles.modeHudBanner, { borderColor: colors.primary }]}>
                <Ionicons
                  name={
                    activeRunSubtype === 'DUO'
                      ? 'people'
                      : activeRunSubtype === 'GROUP'
                      ? 'globe-outline'
                      : activeRunSubtype === 'OFFLINE'
                      ? 'flag'
                      : 'flash'
                  }
                  size={14}
                  color={colors.primary}
                />
                <Text style={[styles.modeHudText, { color: colors.primary }]}>
                  {activeRunSubtype === 'DUO'
                    ? 'DUO SYNC • 2 RUNNERS PACING'
                    : activeRunSubtype === 'GROUP'
                    ? 'SQUAD FORMATION • 4 RUNNERS PACING'
                    : activeRunSubtype === 'OFFLINE'
                    ? `OFFLINE TARGET • ${offlineConfig?.targetDistanceKm || 5}KM (${offlineConfig?.routeMode || 'LOOP'})`
                    : 'SOLO RUN • LIVE SATELLITE GPS'}
                </Text>
              </View>

              {/* Top Stat: Distance */}
              <View style={styles.distanceBlock}>
                <Text style={[styles.distanceNumber, { color: colors.textPrimary }]}>
                  {formatDistanceDisplay(metrics.distanceKm).value}
                </Text>
                <Text style={[styles.distanceUnit, { color: colors.primary }]}>
                  {formatDistanceDisplay(metrics.distanceKm).unit}
                </Text>

                {/* OFFLINE Target Progress & Completion Badge */}
                {offlineConfig?.isOfflineMode && offlineConfig.targetDistanceKm && (
                  <View
                    style={[
                      styles.targetBadge,
                      metrics.distanceKm >= offlineConfig.targetDistanceKm && styles.targetBadgeAchieved,
                    ]}
                  >
                    <Text style={styles.targetBadgeText}>
                      {metrics.distanceKm >= offlineConfig.targetDistanceKm
                        ? `🎉 TARGET COMPLETED (${metrics.distanceKm.toFixed(2)} / ${offlineConfig.targetDistanceKm} KM)`
                        : `TARGET: ${metrics.distanceKm.toFixed(2)} / ${offlineConfig.targetDistanceKm} KM (${Math.min(
                            100,
                            Math.round((metrics.distanceKm / (offlineConfig.targetDistanceKm || 1)) * 100)
                          )}%)`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Group Squad Live Leaderboard Bar (Firebase Group Session) */}
              {groupSession && (
                <View style={[styles.squadActiveBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.squadActiveHeader}>
                    <Ionicons name="people" size={13} color={colors.primary} />
                    <Text style={[styles.squadActiveTitle, { color: colors.primary }]}>
                      {groupSession.title?.toUpperCase() || 'SQUAD RUN'} • {effectivePartnerRunners.length + 1} RUNNERS
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squadScroll}>
                    {/* Local Runner */}
                    <View style={[styles.runnerPill, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                      <Text style={[styles.runnerPillName, { color: colors.primary }]}>YOU</Text>
                      <Text style={[styles.runnerPillDist, { color: colors.textPrimary }]}>
                        {metrics.distanceKm.toFixed(2)} km
                      </Text>
                      <Text style={[styles.runnerPillPace, { color: colors.textSecondary }]}>
                        {metrics.currentPace}
                      </Text>
                    </View>

                    {/* Other Squad Runners */}
                    {effectivePartnerRunners.map((runner) => (
                      <View key={runner.id} style={[styles.runnerPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <Text style={[styles.runnerPillName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {runner.name.split(' ')[0]}
                        </Text>
                        <Text style={[styles.runnerPillDist, { color: colors.primary }]}>
                          {runner.distanceMeters !== undefined ? `${(runner.distanceMeters / 1000).toFixed(2)} km` : '0.00 km'}
                        </Text>
                        <Text style={[styles.runnerPillPace, { color: colors.textSecondary }]}>
                          {runner.pace || '--:--'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Active Duo Partner Pill Indicator (Firebase Duo Session) */}
              {!groupSession && activePartner && (
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

              {/* Partner Pacing Mini-Card for simulated DUO */}
              {!groupSession && !activePartner && activeRunSubtype === 'DUO' && effectivePartnerRunners.length > 0 && (
                <View style={[styles.partnerPacingBar, { borderColor: colors.cardBorder }]}>
                  <Ionicons name="people" size={13} color={colors.primary} />
                  <Text style={[styles.partnerPacingText, { color: colors.textSecondary }]}>
                    Partner <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{effectivePartnerRunners[0].name}</Text> • {effectivePartnerRunners[0].distanceMeters}m away • {effectivePartnerRunners[0].pace}
                  </Text>
                </View>
              )}

              {/* Partner Pacing Mini-Card for simulated GROUP */}
              {!groupSession && !activePartner && activeRunSubtype === 'GROUP' && effectivePartnerRunners.length > 0 && (
                <View style={[styles.partnerPacingBar, { borderColor: colors.cardBorder }]}>
                  <Ionicons name="globe-outline" size={13} color={colors.primary} />
                  <Text style={[styles.partnerPacingText, { color: colors.textSecondary }]}>
                    Squad Crew: <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{effectivePartnerRunners.map((p) => p.name).join(', ')}</Text> • Synced
                  </Text>
                </View>
              )}

              {/* Persistent Live Map Component with Full Map Button & Countdown Overlay */}
              <View style={styles.mapWrapper}>
                {offlineConfig?.isOfflineMode ? (
                  <OfflineSyntheticMap
                    currentDistanceKm={metrics.distanceKm}
                    targetDistanceKm={offlineConfig.targetDistanceKm}
                    routeMode={offlineConfig.routeMode}
                    style={styles.liveMapFill}
                  />
                ) : (
                  <JogpalMap
                    currentLocation={currentLocation}
                    actualRoute={actualRoute}
                    plannedRoute={plannedRoute}
                    partnerRunners={effectivePartnerRunners}
                    style={styles.liveMapFill}
                    interactive={runState !== 'COUNTDOWN'}
                  />
                )}

                {/* Full Screen Expand Button */}
                <TouchableOpacity
                  style={[
                    styles.expandMapButton,
                    {
                      backgroundColor: 'rgba(12, 12, 18, 0.9)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => setIsFullScreenMap(true)}
                  activeOpacity={0.85}
                  accessibilityLabel="Full Screen Map"
                >
                  <Feather name="maximize-2" size={13} color={colors.primary} />
                  <Text style={[styles.expandMapText, { color: colors.primary }]}>FULL MAP</Text>
                </TouchableOpacity>

                {/* Seamless Countdown Overlay on Top of Initialized Map */}
                {runState === 'COUNTDOWN' && (
                  <View style={styles.countdownOverlay}>
                    <Text style={[styles.countdownTitle, { color: colors.textSecondary }]}>GET READY</Text>
                    <Text style={[styles.countdownNumber, { color: colors.primary }]}>{countdownValue}</Text>
                  </View>
                )}
              </View>

              {/* Telemetry Grid Card */}
              <NeonCard style={styles.telemetryCard} contentStyle={styles.telemetryContent}>
                <View style={styles.telemetryRow}>
                  <View style={styles.telemetryCol}>
                    <Text style={styles.telemetryValue}>{formatDuration(metrics.durationSeconds)}</Text>
                    <Text style={styles.telemetryLabel}>TIME</Text>
                  </View>
                  <View style={styles.telemetryDivider} />
                  <View style={styles.telemetryCol}>
                    <Text style={styles.telemetryValue}>
                      {runState === 'PAUSED' ? metrics.avgPace : metrics.currentPace}
                    </Text>
                    <Text style={styles.telemetryLabel}>
                      {runState === 'PAUSED' ? 'AVG PACE' : 'PACE'}
                    </Text>
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

              {/* Dynamic Controls based on runState */}
              {runState === 'ACTIVE' && (
                <TouchableOpacity
                  style={[styles.pauseButton, { backgroundColor: colors.primary }]}
                  onPress={pauseRun}
                  activeOpacity={0.85}
                >
                  <Ionicons name="pause" size={24} color="#000000" />
                  <Text style={styles.pauseButtonText}>PAUSE RUN</Text>
                </TouchableOpacity>
              )}

              {runState === 'PAUSED' && (
                <View style={styles.pausedControlsRow}>
                  <TouchableOpacity
                    style={[styles.resumeBtn, { backgroundColor: colors.primary }]}
                    onPress={resumeRun}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play" size={20} color="#000000" />
                    <Text style={styles.resumeBtnText}>RESUME</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.finishBtn}
                    onPress={finishRun}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="stop" size={20} color="#FFFFFF" />
                    <Text style={styles.finishBtnText}>FINISH</Text>
                  </TouchableOpacity>
                </View>
              )}

              {runState === 'COUNTDOWN' && (
                <View style={[styles.pauseButton, { backgroundColor: '#1A1A22', opacity: 0.7 }]}>
                  <Text style={[styles.pauseButtonText, { color: colors.textSecondary }]}>STARTING SESSION...</Text>
                </View>
              )}
            </View>
          )
        )}

        {/* --- STATE 7: COMPLETING & SUMMARY --- */}
        {(runState === 'COMPLETING' || runState === 'SAVING' || runState === 'SAVED' || runState === 'SYNC_PENDING') && lastRunSummary && (
          isFullScreenMap ? (
            <View style={StyleSheet.absoluteFill}>
              {/* Fullscreen Summary Map */}
              {offlineConfig?.isOfflineMode || (!lastRunSummary.actualRoute?.length && !actualRoute.length) ? (
                <OfflineSyntheticMap
                  currentDistanceKm={lastRunSummary.distanceKm}
                  targetDistanceKm={offlineConfig?.targetDistanceKm || lastRunSummary.distanceKm || 1}
                  routeMode={offlineConfig?.routeMode || 'LOOP'}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <JogpalMap
                  actualRoute={lastRunSummary.actualRoute || actualRoute}
                  plannedRoute={lastRunSummary.plannedRoute || plannedRoute}
                  partnerRunners={partnerRunners}
                  style={StyleSheet.absoluteFill}
                  interactive={true}
                  showStartFinishMarkers={true}
                  fitRouteOnLoad={true}
                />
              )}

              {/* TOP HUD */}
              <View style={[styles.fullScreenTopHud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
                <View style={styles.fullScreenTopRow}>
                  <TouchableOpacity
                    style={[styles.fullScreenCollapseBtn, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.cardBorder }]}
                    onPress={() => setIsFullScreenMap(false)}
                    activeOpacity={0.85}
                  >
                    <Feather name="minimize-2" size={14} color={colors.primary} />
                    <Text style={[styles.fullScreenCollapseText, { color: colors.textPrimary }]}>COLLAPSE</Text>
                  </TouchableOpacity>
                  <View style={[styles.fullScreenModeBadge, { backgroundColor: 'rgba(14, 14, 20, 0.92)', borderColor: colors.primary }]}>
                    <Text style={[styles.fullScreenModeText, { color: colors.primary }]}>ROUTE REVIEW</Text>
                  </View>
                </View>
              </View>

              {/* BOTTOM HUD */}
              <View style={[styles.fullScreenBottomHud, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
                <View style={[styles.fullScreenTelemetryCard, { backgroundColor: 'rgba(12, 12, 18, 0.94)', borderColor: colors.cardBorder }]}>
                  <View style={styles.telemetryRow}>
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>{formatDistanceDisplay(lastRunSummary.distanceKm).value}</Text>
                      <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>{formatDistanceDisplay(lastRunSummary.distanceKm).unit}</Text>
                    </View>
                    <View style={[styles.telemetryDivider, { backgroundColor: colors.cardBorder }]} />
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>{formatDuration(lastRunSummary.durationSeconds)}</Text>
                      <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>TIME</Text>
                    </View>
                    <View style={[styles.telemetryDivider, { backgroundColor: colors.cardBorder }]} />
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>{lastRunSummary.pace}</Text>
                      <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>PACE</Text>
                    </View>
                  </View>
                </View>

                {runState === 'COMPLETING' && (
                  <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={handleSaveAndDone} activeOpacity={0.85}>
                    <Text style={styles.startRunText}>SAVE RUN</Text>
                  </TouchableOpacity>
                )}

                {(runState === 'SAVED' || runState === 'SYNC_PENDING') && (
                  <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={handleFinishDone} activeOpacity={0.85}>
                    <Text style={styles.startRunText}>DONE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.activeContainer}>
              <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>RUN SUMMARY</Text>
              <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>
                {lastRunSummary.subtype === 'DUO'
                  ? 'DUO RUN SESSION COMPLETED WITH PARTNER'
                  : lastRunSummary.subtype === 'GROUP'
                  ? 'SQUAD RUN SESSION COMPLETED WITH CREW'
                  : lastRunSummary.subtype === 'OFFLINE'
                  ? 'OFFLINE TARGET COMPLETED'
                  : 'SOLO RUN SESSION COMPLETED'}
              </Text>

              {/* Completed Route Map View with Full Map Button */}
              <View style={styles.summaryMapWrapper}>
                {offlineConfig?.isOfflineMode || (!lastRunSummary.actualRoute?.length && !actualRoute.length) ? (
                  <OfflineSyntheticMap
                    currentDistanceKm={lastRunSummary.distanceKm}
                    targetDistanceKm={offlineConfig?.targetDistanceKm || lastRunSummary.distanceKm || 1}
                    routeMode={offlineConfig?.routeMode || 'LOOP'}
                    style={styles.liveMapFill}
                  />
                ) : (
                  <JogpalMap
                    actualRoute={lastRunSummary.actualRoute || actualRoute}
                    plannedRoute={lastRunSummary.plannedRoute || plannedRoute}
                    partnerRunners={partnerRunners}
                    style={styles.liveMapFill}
                    interactive={true}
                    showStartFinishMarkers={true}
                    fitRouteOnLoad={true}
                  />
                )}

                {/* Full Screen Expand Button */}
                <TouchableOpacity
                  style={[
                    styles.expandMapButton,
                    {
                      backgroundColor: 'rgba(12, 12, 18, 0.9)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => setIsFullScreenMap(true)}
                  activeOpacity={0.85}
                  accessibilityLabel="Full Screen Map"
                >
                  <Feather name="maximize-2" size={13} color={colors.primary} />
                  <Text style={[styles.expandMapText, { color: colors.primary }]}>FULL MAP</Text>
                </TouchableOpacity>
              </View>

              <NeonCard style={styles.summaryCard} contentStyle={styles.summaryContent}>
                <View style={styles.summaryTopRow}>
                  <View>
                    <Text style={styles.summaryTitle}>
                      {lastRunSummary.title || (offlineConfig?.isOfflineMode ? `OFFLINE ${offlineConfig.targetDistanceKm}KM RUN` : 'SOLO RUN')}
                    </Text>
                    <Text style={[styles.summarySubtype, { color: colors.primary }]}>
                      {lastRunSummary.subtype === 'DUO'
                        ? 'DUO SYNC RUN'
                        : lastRunSummary.subtype === 'GROUP'
                        ? 'SQUAD CREW RUN'
                        : lastRunSummary.subtype === 'OFFLINE'
                        ? 'OFFLINE TARGET RUN'
                        : 'SOLO RUN'}
                    </Text>
                  </View>
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
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.savingText, { color: colors.primary }]}>SAVING & SYNCING TO CLOUD...</Text>
                </View>
              )}

              {(runState === 'SAVED' || runState === 'SYNC_PENDING') && (
                <TouchableOpacity style={[styles.startRunButton, { backgroundColor: colors.primary }]} onPress={handleFinishDone} activeOpacity={0.85}>
                  <Text style={styles.startRunText}>DONE</Text>
                </TouchableOpacity>
              )}
            </View>
          )
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
  modeChipsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginVertical: 10,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#16161D',
  },
  modeChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modeInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    width: '100%',
  },
  modeInfoText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  previewMapWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  liveMap: {
    height: 260,
    width: '100%',
    marginVertical: 10,
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 260,
    marginVertical: 10,
    borderRadius: 22,
    overflow: 'hidden',
  },
  summaryMapWrapper: {
    position: 'relative',
    width: '100%',
    height: 160,
    marginVertical: 10,
    borderRadius: 22,
    overflow: 'hidden',
  },
  expandMapButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 25,
  },
  expandMapText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  liveMapFill: {
    width: '100%',
    height: '100%',
    marginVertical: 0,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 14, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    borderRadius: 22,
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
  modeHudBanner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 20, 26, 0.95)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 4,
  },
  modeHudText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  targetBadge: {
    alignSelf: 'center',
    backgroundColor: '#1E1E26',
    borderWidth: 1,
    borderColor: '#333344',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  targetBadgeAchieved: {
    backgroundColor: '#0A331A',
    borderColor: '#00FF66',
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00FF66',
    letterSpacing: 0.8,
  },
  partnerPacingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(18, 18, 24, 0.9)',
    marginBottom: 6,
  },
  partnerPacingText: {
    fontSize: 11,
    letterSpacing: 0.5,
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
  summarySubtype: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
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
  squadStatusContainer: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginVertical: 12,
    gap: 8,
  },
  squadFriendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  squadFriendName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  forceStartBtn: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  forceStartBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  squadActiveBar: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginTop: -8,
    marginBottom: 10,
  },
  squadActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  squadActiveTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  squadScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  runnerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  runnerPillName: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  runnerPillDist: {
    fontSize: 12,
    fontWeight: '900',
  },
  runnerPillPace: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  fullScreenTopHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  fullScreenTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fullScreenCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  fullScreenCollapseText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fullScreenModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  fullScreenModeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fullScreenGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  gpsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  fullScreenGpsText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fullScreenPausedBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(51, 41, 0, 0.94)',
    borderColor: '#FFD700',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  fullScreenHeroDistanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  fullScreenDistanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  fullScreenDistanceNumber: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  fullScreenDistanceUnit: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  fullScreenSquadBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    marginTop: 6,
  },
  fullScreenBottomHud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  fullScreenTelemetryCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
});
