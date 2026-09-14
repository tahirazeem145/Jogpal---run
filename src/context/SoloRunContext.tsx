import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, Alert } from 'react-native';
import { RunState, GPSPoint, SoloRunMetrics, PendingRun, LatLng, OfflineRouteMode, OfflineTargetConfig } from '../types/soloRun';
import { locationService, isValidGPSPoint, validateGPSPoint, isValidMapLocation, calculateHaversineDistanceKm, calculateRollingPaceString, getAccuracyTier } from '../services/locationService';
import { offlineSyncService } from '../services/offlineSyncService';
import { useApp } from './AppContext';
import { PartnerRunner } from '../types/map';
import { CrewMember, DuoRunSession, DuoParticipantTelemetry, GroupRunSession, GroupParticipantTelemetry } from '../types/data';
import { duoRunService } from '../services/duoRunService';
import { groupRunService } from '../services/groupRunService';

interface SoloRunContextType {
  runState: RunState;
  metrics: SoloRunMetrics;
  routePoints: GPSPoint[];
  currentLocation: GPSPoint | null;
  actualRoute: LatLng[];
  plannedRoute: LatLng[];
  countdownValue: number;
  lastRunSummary: PendingRun | null;
  errorMessage: string | null;
  activeRunTitle: string;
  activeRunType: 'SOLO' | 'CREW';
  offlineConfig: OfflineTargetConfig | null;
  activePartner: CrewMember | null;
  activeCrewMembers?: CrewMember[] | null;
  partnerRunner: PartnerRunner | null;
  partnerRunners: PartnerRunner[];
  duoSessionId: string | null;
  duoSession: DuoRunSession | null;
  groupSessionId: string | null;
  groupSession: GroupRunSession | null;
  isDuoWaitingForPartner: boolean;
  isGroupWaitingForPartners: boolean;
  groupAcceptedCount: number;
  groupTotalInvitedCount: number;
  startPreparation: (
    title?: string,
    type?: 'SOLO' | 'CREW',
    offlineTargetConfig?: OfflineTargetConfig | null,
    partner?: CrewMember | null,
    sessionId?: string | null,
    crewMembers?: CrewMember[] | null,
    isGroupSession?: boolean
  ) => Promise<void>;
  startOfflinePreparation: (targetKm: number, routeMode: OfflineRouteMode) => Promise<void>;
  startCountdown: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  finishRun: () => Promise<void>;
  saveRun: () => Promise<void>;
  cancelRun: () => void;
  resetState: () => void;
}

const initialMetrics: SoloRunMetrics = {
  distanceKm: 0,
  durationSeconds: 0,
  currentPace: '--:--',
  avgPace: '--:--',
  currentSpeedKmH: null,
  avgSpeedKmH: null,
  maxSpeedKmH: null,
  gpsAccuracy: null,
  gpsStatus: 'SEARCHING',
  trackingIntegrityScore: 100,
  stage1Ready: false,
  stage2Ready: false,
  trackingReady: false,
  firstLocationLatencyMs: null,
  trackingReadyLatencyMs: null,
};

const SoloRunContext = createContext<SoloRunContextType | undefined>(undefined);

export const SoloRunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, logNewRun } = useApp();
  const activeUserId = user?.uid || userProfile?.id || '';

  const [runState, setRunState] = useState<RunState>('IDLE');
  const runStateRef = useRef<RunState>('IDLE');

  const updateRunState = (newState: RunState | ((prev: RunState) => RunState)) => {
    setRunState((prev) => {
      const next = typeof newState === 'function' ? newState(prev) : newState;
      runStateRef.current = next;
      return next;
    });
  };
  const [metrics, setMetrics] = useState<SoloRunMetrics>(initialMetrics);
  const [routePoints, setRoutePoints] = useState<GPSPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSPoint | null>(null);
  const [actualRoute, setActualRoute] = useState<LatLng[]>([]);
  const [plannedRoute, setPlannedRoute] = useState<LatLng[]>([]);
  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [lastRunSummary, setLastRunSummary] = useState<PendingRun | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRunTitle, setActiveRunTitle] = useState<string>('SOLO RUN');
  const [activeRunType, setActiveRunType] = useState<'SOLO' | 'CREW'>('SOLO');
  const [offlineConfig, setOfflineConfig] = useState<OfflineTargetConfig | null>(null);
  const [activePartner, setActivePartner] = useState<CrewMember | null>(null);
  const [activeCrewMembers, setActiveCrewMembers] = useState<CrewMember[] | null>(null);
  const [partnerRunner, setPartnerRunner] = useState<PartnerRunner | null>(null);
  const [partnerRunners, setPartnerRunners] = useState<PartnerRunner[]>([]);
  const [duoSessionId, setDuoSessionId] = useState<string | null>(null);
  const [duoSession, setDuoSession] = useState<DuoRunSession | null>(null);
  const [groupSessionId, setGroupSessionId] = useState<string | null>(null);
  const [groupSession, setGroupSession] = useState<GroupRunSession | null>(null);
  const [isDuoWaitingForPartner, setIsDuoWaitingForPartner] = useState<boolean>(false);
  const [isGroupWaitingForPartners, setIsGroupWaitingForPartners] = useState<boolean>(false);
  const activePartnerRef = useRef<CrewMember | null>(null);
  const duoSessionIdRef = useRef<string | null>(null);
  const groupSessionIdRef = useRef<string | null>(null);
  const duoSessionSubRef = useRef<(() => void) | null>(null);
  const groupSessionSubRef = useRef<(() => void) | null>(null);
  const lastTelemetryBroadcastRef = useRef<number>(0);

  const startOfflinePreparation = async (targetKm: number, routeMode: OfflineRouteMode) => {
    const config: OfflineTargetConfig = {
      isOfflineMode: true,
      targetDistanceKm: targetKm,
      routeMode,
    };
    setOfflineConfig(config);
    await startPreparation(`OFFLINE ${targetKm}KM TARGET (${routeMode})`, 'SOLO', config, null, null);
  };

  // Telemetry & Timing Refs
  const locationSubRef = useRef<{ remove: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAcceptedPointRef = useRef<GPSPoint | null>(null);
  const routePointsRef = useRef<GPSPoint[]>([]);
  const actualRouteRef = useRef<LatLng[]>([]);
  const accumulatedDistanceKmRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const prepStartTimeRef = useRef<number | null>(null);
  const accumulatedDurationRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const backgroundTimeRef = useRef<number | null>(null);
  const totalPointCountRef = useRef<number>(0);
  const acceptedPointCountRef = useRef<number>(0);
  const trackingReadyRef = useRef<boolean>(false);
  const titleRef = useRef<string>('SOLO RUN');
  const typeRef = useRef<'SOLO' | 'CREW'>('SOLO');

  // 1. App Lifecycle (Background / Foreground Timer Integrity)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (runState === 'ACTIVE') {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          backgroundTimeRef.current = Date.now();
        } else if (nextAppState === 'active' && backgroundTimeRef.current) {
          const deltaSec = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
          accumulatedDurationRef.current += Math.max(0, deltaSec);
          backgroundTimeRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [runState]);

  // 2. Android Hardware Back Button Protection
  useEffect(() => {
    const onBackPress = () => {
      if (runState === 'ACTIVE' || runState === 'PAUSED' || runState === 'COUNTDOWN') {
        Alert.alert(
          'Active Run In Progress',
          'Would you like to pause or exit your current run session?',
          [
            { text: 'Keep Running', style: 'cancel' },
            {
              text: 'Pause Run',
              onPress: () => pauseRun(),
            },
            {
              text: 'Discard Run',
              style: 'destructive',
              onPress: () => cancelRun(),
            },
          ]
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [runState]);

  // Helper: Format pace string in MM:SS /km
  const calculatePaceString = (distanceKm: number, durationSeconds: number): string => {
    if (distanceKm < 0.05 || durationSeconds < 3) return '--:--';
    const paceDecimalMinutes = durationSeconds / 60 / distanceKm;
    if (!isFinite(paceDecimalMinutes) || paceDecimalMinutes > 30) return '--:--';
    const mins = Math.floor(paceDecimalMinutes);
    const secs = Math.round((paceDecimalMinutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  const stopLocationWatching = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Helper: Group invites helper counts
  const groupInvitedList = Object.values(groupSession?.invitedFriends || {});
  const groupAcceptedCount = groupInvitedList.filter((f) => f.status === 'ACCEPTED').length;
  const groupTotalInvitedCount = groupInvitedList.length;

  // 3. TWO-STAGE PARALLEL LOCATION ACQUISITION
  const startPreparation = async (
    title = 'SOLO RUN',
    type: 'SOLO' | 'CREW' = 'SOLO',
    offlineTargetConfig: OfflineTargetConfig | null = null,
    partner: CrewMember | null = null,
    sessionId: string | null = null,
    crewMembers: CrewMember[] | null = null,
    isGroupSession: boolean = false
  ) => {
    const prepStart = Date.now();
    prepStartTimeRef.current = prepStart;
    titleRef.current = title;
    typeRef.current = type;
    activePartnerRef.current = partner;
    setActivePartner(partner);
    setActiveCrewMembers(crewMembers);
    if (!partner && (!crewMembers || crewMembers.length === 0)) {
      setPartnerRunner(null);
      setPartnerRunners([]);
    }
    setActiveRunTitle(title);
    setActiveRunType(type);

    // Clean up previous listeners
    if (duoSessionSubRef.current) {
      duoSessionSubRef.current();
      duoSessionSubRef.current = null;
    }
    if (groupSessionSubRef.current) {
      groupSessionSubRef.current();
      groupSessionSubRef.current = null;
    }

    const isGroup = isGroupSession || (sessionId ? sessionId.startsWith('group_') : false);

    if (isGroup && sessionId) {
      setGroupSessionId(sessionId);
      groupSessionIdRef.current = sessionId;
      setDuoSessionId(null);
      duoSessionIdRef.current = null;
      setDuoSession(null);
      setIsDuoWaitingForPartner(false);

      const unsubGroup = groupRunService.subscribeToGroupSession(sessionId, (session) => {
        if (!session) return;
        setGroupSession(session);

        const invitedList = Object.values(session.invitedFriends || {});
        const acceptedList = invitedList.filter((f) => f.status === 'ACCEPTED');

        if (session.hostUserId === activeUserId) {
          // Host: if no friends have accepted yet, show waiting state
          if (acceptedList.length === 0 && session.status === 'INVITED') {
            setIsGroupWaitingForPartners(true);
          } else {
            setIsGroupWaitingForPartners(false);
          }
        } else {
          // Guest runner who joined
          setIsGroupWaitingForPartners(false);
        }

        // Map all other participants (other squad runners)
        const otherRunners: PartnerRunner[] = [];
        if (session.participants) {
          Object.keys(session.participants).forEach((uid) => {
            if (uid !== activeUserId) {
              const pData = session.participants![uid];
              if (pData && (pData.latitude || pData.longitude)) {
                otherRunners.push({
                  id: pData.userId,
                  name: pData.name || 'Squad Runner',
                  avatarUrl: pData.avatarUrl,
                  latitude: pData.latitude,
                  longitude: pData.longitude,
                  distanceMeters: Math.round((pData.distanceKm || 0) * 1000),
                  pace: pData.pace || '--:--',
                });
              }
            }
          });
        }
        setPartnerRunners(otherRunners);
        if (otherRunners.length > 0) {
          setPartnerRunner(otherRunners[0]);
        }
      });
      groupSessionSubRef.current = unsubGroup;
    } else if (sessionId) {
      setGroupSessionId(null);
      groupSessionIdRef.current = null;
      setGroupSession(null);
      setIsGroupWaitingForPartners(false);
      setDuoSessionId(sessionId);
      duoSessionIdRef.current = sessionId;

      // Subscribe to real-time Duo session
      const unsub = duoRunService.subscribeToDuoSession(sessionId, (session) => {
        if (!session) return;
        setDuoSession(session);

        if (session.status === 'INVITED' && session.hostUserId === activeUserId) {
          setIsDuoWaitingForPartner(true);
        } else if (session.status === 'ACCEPTED' || session.status === 'ACTIVE') {
          setIsDuoWaitingForPartner(false);
        }

        // Live Partner Telemetry from partner's real phone
        if (session.participants) {
          const partnerUserId = Object.keys(session.participants).find((uid) => uid !== activeUserId);
          if (partnerUserId) {
            const partnerData = session.participants[partnerUserId];
            if (partnerData && partnerData.latitude && partnerData.longitude) {
              const pRunner: PartnerRunner = {
                id: partnerData.userId,
                name: partnerData.name || activePartnerRef.current?.name || 'Partner',
                avatarUrl: partnerData.avatarUrl || activePartnerRef.current?.avatarUrl || activePartnerRef.current?.photoURL,
                latitude: partnerData.latitude,
                longitude: partnerData.longitude,
                distanceMeters: Math.round((partnerData.distanceKm || 0) * 1000),
                pace: partnerData.pace || '--:--',
              };
              setPartnerRunner(pRunner);
              setPartnerRunners([pRunner]);
            }
          }
        }
      });
      duoSessionSubRef.current = unsub;
    } else {
      setDuoSession(null);
      setGroupSession(null);
      setDuoSessionId(null);
      setGroupSessionId(null);
      duoSessionIdRef.current = null;
      groupSessionIdRef.current = null;
      setIsDuoWaitingForPartner(false);
      setIsGroupWaitingForPartners(false);
      setPartnerRunners([]);
    }

    console.log(`[TELEMETRY] LOCATION_REQUEST_STARTED for ${title}`);
    setOfflineConfig(offlineTargetConfig);
    updateRunState('PREPARING');
    setErrorMessage(null);
    setMetrics(initialMetrics);
    setRoutePoints([]);
    setActualRoute([]);
    setCurrentLocation(null);
    routePointsRef.current = [];
    actualRouteRef.current = [];
    accumulatedDistanceKmRef.current = 0;
    accumulatedDurationRef.current = 0;
    lastAcceptedPointRef.current = null;
    isPausedRef.current = false;
    totalPointCountRef.current = 0;
    acceptedPointCountRef.current = 0;
    trackingReadyRef.current = false;

    // Check permissions & location services
    const granted = await locationService.requestPermissions();
    if (!granted) {
      updateRunState('ERROR');
      setErrorMessage('Location permission was denied. Enable GPS in device settings.');
      return;
    }

    const servicesEnabled = await locationService.checkServicesEnabled();
    if (!servicesEnabled) {
      updateRunState('ERROR');
      setErrorMessage('Location services (GPS) are disabled on this device. Please turn on GPS.');
      return;
    }

    updateRunState('GPS_SEARCHING');

    // STAGE 1 (FAST PARALLEL ACQUISITION): Get last known position / quick position for immediate map centering (< 1.5s)
    Promise.all([
      locationService.getLastKnownLocation(),
      locationService.getQuickInitialLocation(),
    ]).then(([lastKnown, quickCurrent]) => {
      const stage1Point = quickCurrent || lastKnown;
      if (stage1Point && !trackingReadyRef.current) {
        const latency = Date.now() - prepStart;
        console.log(`[TELEMETRY] FIRST_LOCATION_RECEIVED (Latency: ${latency}ms)`);
        setCurrentLocation(stage1Point);

        if (activePartnerRef.current && !sessionId) {
          const simRunner: PartnerRunner = {
            id: activePartnerRef.current.id || activePartnerRef.current.userId || 'partner_1',
            name: activePartnerRef.current.name || 'Partner',
            avatarUrl: activePartnerRef.current.avatarUrl || activePartnerRef.current.photoURL,
            latitude: stage1Point.latitude + 0.00012,
            longitude: stage1Point.longitude + 0.00012,
            distanceMeters: 0,
            pace: '--:--',
          };
          setPartnerRunner(simRunner);
          setPartnerRunners([simRunner]);
        }

        setMetrics((prev) => ({
          ...prev,
          stage1Ready: true,
          firstLocationLatencyMs: latency,
          gpsStatus: prev.gpsStatus === 'SEARCHING' ? 'READY' : prev.gpsStatus,
        }));

        // Enable GPS_READY stage immediately so user can press START RUN without waiting
        updateRunState((curr) => (curr === 'GPS_SEARCHING' || curr === 'PREPARING' ? 'GPS_READY' : curr));
      }
    }).catch(() => {});

    // STAGE 2 (HIGH-ACCURACY WATCHER): Start continuous high-accuracy location watcher
    stopLocationWatching();
    locationSubRef.current = locationService.watchLocation(
      (point) => handleIncomingGPSPoint(point),
      (err) => {
        setMetrics((prev) => ({ ...prev, gpsStatus: 'LOST' }));
      }
    );
  };

  // 4. GPS PROCESSING & READINESS PIPELINE
  const handleIncomingGPSPoint = (point: GPSPoint) => {
    totalPointCountRef.current += 1;

    // MAP LOCATION: Update current location for map centering & runner marker display
    if (isValidMapLocation(point)) {
      setCurrentLocation(point);

      // Real-time broadcast in Group Run session
      if (groupSessionIdRef.current) {
        const now = Date.now();
        if (now - lastTelemetryBroadcastRef.current >= 1200) {
          lastTelemetryBroadcastRef.current = now;
          groupRunService.updateParticipantTelemetry(groupSessionIdRef.current, activeUserId, {
            name: userProfile?.displayName || 'Runner',
            avatarUrl: userProfile?.photoURL,
            initial: (userProfile?.displayName?.trim().charAt(0) || 'R').toUpperCase(),
            latitude: point.latitude,
            longitude: point.longitude,
            distanceKm: accumulatedDistanceKmRef.current,
            pace: calculatePaceString(accumulatedDistanceKmRef.current, accumulatedDurationRef.current),
            speedKmH: point.speed ? Math.round(point.speed * 3.6 * 10) / 10 : 0,
            runState: runStateRef.current as any,
          }).catch(() => {});
        }
      } else if (duoSessionIdRef.current) {
        // Real-time broadcast to partner in live Duo Run session
        const now = Date.now();
        if (now - lastTelemetryBroadcastRef.current >= 1200) {
          lastTelemetryBroadcastRef.current = now;
          duoRunService.updateParticipantTelemetry(duoSessionIdRef.current, activeUserId, {
            name: userProfile?.displayName || 'Runner',
            avatarUrl: userProfile?.photoURL,
            latitude: point.latitude,
            longitude: point.longitude,
            distanceKm: accumulatedDistanceKmRef.current,
            pace: calculatePaceString(accumulatedDistanceKmRef.current, accumulatedDurationRef.current),
            speedKmH: point.speed ? Math.round(point.speed * 3.6 * 10) / 10 : 0,
            runState: runStateRef.current as any,
          }).catch(() => {});
        }
      } else if (activePartnerRef.current) {
        const simRunner: PartnerRunner = {
          id: activePartnerRef.current?.id || activePartnerRef.current?.userId || 'partner_1',
          name: activePartnerRef.current?.name || 'Partner',
          avatarUrl: activePartnerRef.current?.avatarUrl || activePartnerRef.current?.photoURL,
          latitude: point.latitude + 0.00012,
          longitude: point.longitude + 0.00012,
          distanceMeters: Math.round(accumulatedDistanceKmRef.current * 1000 * 0.98),
          pace: calculatePaceString(accumulatedDistanceKmRef.current, accumulatedDurationRef.current),
        };
        setPartnerRunner(simRunner);
        setPartnerRunners([simRunner]);
      }
    }

    const accuracy = point.accuracy;
    const isTrackingQuality = accuracy !== null && accuracy <= 35;

    // First time receiving tracking-quality point
    if (isTrackingQuality && !metrics.stage2Ready) {
      const trackingLatency = prepStartTimeRef.current ? Date.now() - prepStartTimeRef.current : null;
      console.log(`[TELEMETRY] FIRST_ACCURATE_LOCATION_RECEIVED (Latency: ${trackingLatency}ms)`);
      console.log('[TELEMETRY] TRACKING_READY');

      setMetrics((prev) => ({
        ...prev,
        stage2Ready: true,
        trackingReadyLatencyMs: trackingLatency,
      }));
    }

    // Advance runState to GPS_READY if currently PREPARING or SEARCHING
    const currentRunState = runStateRef.current;
    if ((currentRunState === 'GPS_SEARCHING' || currentRunState === 'PREPARING') && (accuracy === null || accuracy <= 500)) {
      updateRunState('GPS_READY');
    }

    setMetrics((prev) => {
      let gpsStatus: SoloRunMetrics['gpsStatus'] = 'SEARCHING';
      if (accuracy !== null) {
        if (accuracy <= 25) gpsStatus = 'READY';
        else if (accuracy <= 100) gpsStatus = 'GOOD';
        else if (accuracy <= 500) gpsStatus = 'POOR';
        else gpsStatus = 'LOST';
      }

      return {
        ...prev,
        gpsAccuracy: accuracy,
        gpsStatus,
        currentSpeedKmH: point.speed !== null && point.speed > 0 ? Math.round(point.speed * 3.6 * 10) / 10 : prev.currentSpeedKmH,
      };
    });

    // If ACTIVE or COUNTDOWN and NOT PAUSED
    const activeState = runStateRef.current;
    if (!isPausedRef.current && (activeState === 'ACTIVE' || activeState === 'COUNTDOWN')) {
      const validation = validateGPSPoint(point, lastAcceptedPointRef.current, acceptedPointCountRef.current);
      if (!validation.isValid) {
        console.log(`[GPS_REJECTED] Reason: ${validation.reason || 'UNKNOWN'} | Acc: ${point.accuracy}m | Speed: ${point.speed} | Lat: ${point.latitude.toFixed(5)}, Lng: ${point.longitude.toFixed(5)}`);
        return;
      }

      console.log(`[GPS_ACCEPTED] Accepted tracking point #${acceptedPointCountRef.current + 1} | Lat: ${point.latitude.toFixed(6)}, Lng: ${point.longitude.toFixed(6)}`);

      // Unlock trackingReady flag
      if (!trackingReadyRef.current) {
        trackingReadyRef.current = true;
        setMetrics((prev) => ({ ...prev, trackingReady: true }));
        console.log('[TELEMETRY] TRACKING_STARTED');
      }

      acceptedPointCountRef.current += 1;
      const integrity = Math.min(100, Math.max(0, Math.round((acceptedPointCountRef.current / totalPointCountRef.current) * 100)));

      const newCoord: LatLng = { latitude: point.latitude, longitude: point.longitude };
      routePointsRef.current.push(point);
      setRoutePoints([...routePointsRef.current]);

      if (!lastAcceptedPointRef.current) {
        lastAcceptedPointRef.current = point;
        actualRouteRef.current = [newCoord];
        setActualRoute([newCoord]);
      } else {
        const segKm = calculateHaversineDistanceKm(
          lastAcceptedPointRef.current.latitude,
          lastAcceptedPointRef.current.longitude,
          point.latitude,
          point.longitude
        );

        // Accumulate distance whenever displacement >= 0.3 meters (0.0003 km)
        if (segKm >= 0.0003) {
          lastAcceptedPointRef.current = point;
          actualRouteRef.current.push(newCoord);
          setActualRoute([...actualRouteRef.current]);

          // Only accumulate distance during ACTIVE state (not during countdown)
          if (activeState === 'ACTIVE') {
            accumulatedDistanceKmRef.current += segKm;
          }
          const currentTotalDistance = Math.round(accumulatedDistanceKmRef.current * 1000) / 1000;

          const recentSlice = routePointsRef.current.slice(-8);
          const rollingPace = calculateRollingPaceString(recentSlice);
          const overallPace = calculatePaceString(currentTotalDistance, accumulatedDurationRef.current);
          const speedKmH = point.speed !== null && point.speed > 0 ? Math.round(point.speed * 3.6 * 10) / 10 : null;

          setMetrics((prev) => {
            const maxSpeed = Math.max(prev.maxSpeedKmH || 0, speedKmH || 0);
            return {
              ...prev,
              distanceKm: currentTotalDistance,
              currentPace: rollingPace !== '--:--' ? rollingPace : overallPace,
              avgPace: overallPace,
              currentSpeedKmH: speedKmH,
              maxSpeedKmH: maxSpeed > 0 ? maxSpeed : prev.maxSpeedKmH,
              trackingIntegrityScore: integrity,
            };
          });
        }
      }
    }
  };

  // 5. Countdown & Smart Start
  const startCountdown = () => {
    const currState = runStateRef.current;
    if (currState !== 'GPS_READY' && currState !== 'GPS_SEARCHING') return;
    updateRunState('COUNTDOWN');
    setCountdownValue(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      if (count <= 0) {
        clearInterval(interval);
        startActiveRun();
      }
    }, 1000);
  };

  const startActiveRun = () => {
    updateRunState('ACTIVE');
    isPausedRef.current = false;
    startTimeRef.current = Date.now();

    stopTimer();
    // User elapsed active timer starts immediately
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        accumulatedDurationRef.current += 1;
        const currentSecs = accumulatedDurationRef.current;

        setMetrics((prev) => {
          const pace = calculatePaceString(prev.distanceKm, currentSecs);
          const avgSpeed = prev.distanceKm > 0 && currentSecs > 0 ? Math.round((prev.distanceKm / (currentSecs / 3600)) * 10) / 10 : null;
          return {
            ...prev,
            durationSeconds: currentSecs,
            currentPace: pace,
            avgPace: pace,
            avgSpeedKmH: avgSpeed,
          };
        });
      }
    }, 1000);
  };

  // 6. Pause Run
  const pauseRun = () => {
    if (runStateRef.current !== 'ACTIVE') return;
    updateRunState('PAUSED');
    isPausedRef.current = true;
  };

  // 7. Resume Run
  const resumeRun = () => {
    if (runStateRef.current !== 'PAUSED') return;
    updateRunState('ACTIVE');
    isPausedRef.current = false;
    // Reset reference point on resume so paused physical movement is NOT counted
    lastAcceptedPointRef.current = null;
  };

  const isCompletingRef = useRef<boolean>(false);
  const isSavedRef = useRef<boolean>(false);

  // 8. Finish Run (Idempotent: executes exactly once per session)
  const finishRun = async () => {
    const state = runStateRef.current;
    if (isCompletingRef.current || (state !== 'ACTIVE' && state !== 'PAUSED')) return;
    isCompletingRef.current = true;
    updateRunState('COMPLETING');
    isPausedRef.current = true;
    stopTimer();
    stopLocationWatching();

    const effectiveDistance = Math.max(accumulatedDistanceKmRef.current, metrics.distanceKm);
    const finalDistance = Math.round(effectiveDistance * 100) / 100;
    const finalDuration = Math.max(1, accumulatedDurationRef.current || metrics.durationSeconds);
    const finalPace = calculatePaceString(finalDistance, finalDuration);
    const finalRoute = actualRouteRef.current.length > 0 ? [...actualRouteRef.current] : actualRoute;

    const summary: PendingRun = {
      localId: `run_${Date.now()}`,
      userId: activeUserId,
      title: titleRef.current || 'SOLO RUN',
      type: typeRef.current || 'SOLO',
      distanceKm: finalDistance,
      durationSeconds: finalDuration,
      pace: finalPace,
      avgSpeedKmH: metrics.avgSpeedKmH ?? undefined,
      maxSpeedKmH: metrics.maxSpeedKmH ?? undefined,
      createdAt: new Date().toISOString(),
      plannedRoute,
      actualRoute: finalRoute,
      trackingIntegrityScore: metrics.trackingIntegrityScore,
      syncStatus: 'SYNC_PENDING',
    };

    setLastRunSummary(summary);

    // Auto-save to Firebase and update local stats immediately
    setTimeout(() => {
      saveRun(summary);
    }, 100);
  };

  // 9. Save Run (Idempotent: saves local first, syncs Firebase separately)
  const saveRun = async (overrideSummary?: PendingRun) => {
    const summaryToSave = overrideSummary || lastRunSummary;
    const currentState = runStateRef.current;
    if (isSavedRef.current || !summaryToSave) return;
    isSavedRef.current = true;
    updateRunState('SAVING');

    try {
      await logNewRun(
        summaryToSave.distanceKm,
        summaryToSave.durationSeconds,
        summaryToSave.pace,
        summaryToSave.title,
        summaryToSave.type,
        {
          route: summaryToSave.actualRoute,
          avgSpeedKmH: summaryToSave.avgSpeedKmH,
          maxSpeedKmH: summaryToSave.maxSpeedKmH,
          calories: Math.round(summaryToSave.distanceKm * 62),
          startLocation:
            summaryToSave.actualRoute && summaryToSave.actualRoute.length > 0
              ? summaryToSave.actualRoute[0]
              : undefined,
          endLocation:
            summaryToSave.actualRoute && summaryToSave.actualRoute.length > 1
              ? summaryToSave.actualRoute[summaryToSave.actualRoute.length - 1]
              : undefined,
        }
      );
      updateRunState('SAVED');
      offlineSyncService.syncPendingRuns(activeUserId).catch(() => {});
    } catch (err) {
      console.warn('Firebase run logging failed, backing up to offline storage:', err);
      await offlineSyncService.savePendingRun({
        userId: summaryToSave.userId,
        title: summaryToSave.title,
        type: summaryToSave.type,
        distanceKm: summaryToSave.distanceKm,
        durationSeconds: summaryToSave.durationSeconds,
        pace: summaryToSave.pace,
        createdAt: summaryToSave.createdAt,
        plannedRoute: summaryToSave.plannedRoute,
        actualRoute: summaryToSave.actualRoute,
        trackingIntegrityScore: summaryToSave.trackingIntegrityScore,
      });
      updateRunState('SYNC_PENDING');
    }
  };

  // 10. Cancel & Reset
  const cancelRun = () => {
    stopTimer();
    stopLocationWatching();
    resetState();
  };

  const resetState = () => {
    updateRunState('IDLE');
    setMetrics(initialMetrics);
    setRoutePoints([]);
    setActualRoute([]);
    setPlannedRoute([]);
    setCurrentLocation(null);
    setLastRunSummary(null);
    setErrorMessage(null);
    accumulatedDistanceKmRef.current = 0;
    accumulatedDurationRef.current = 0;
    routePointsRef.current = [];
    actualRouteRef.current = [];
    lastAcceptedPointRef.current = null;
    isPausedRef.current = false;
    isCompletingRef.current = false;
    isSavedRef.current = false;
    totalPointCountRef.current = 0;
    acceptedPointCountRef.current = 0;
    trackingReadyRef.current = false;
    prepStartTimeRef.current = null;
    titleRef.current = 'SOLO RUN';
    typeRef.current = 'SOLO';
    if (duoSessionSubRef.current) {
      duoSessionSubRef.current();
      duoSessionSubRef.current = null;
    }
    if (groupSessionSubRef.current) {
      groupSessionSubRef.current();
      groupSessionSubRef.current = null;
    }
    if (duoSessionIdRef.current) {
      duoRunService.endDuoSession(duoSessionIdRef.current).catch(() => {});
    }
    if (groupSessionIdRef.current) {
      groupRunService.endGroupSession(groupSessionIdRef.current).catch(() => {});
    }
    setDuoSessionId(null);
    duoSessionIdRef.current = null;
    setGroupSessionId(null);
    groupSessionIdRef.current = null;
    setDuoSession(null);
    setGroupSession(null);
    setIsDuoWaitingForPartner(false);
    setIsGroupWaitingForPartners(false);
    activePartnerRef.current = null;
    setActivePartner(null);
    setActiveCrewMembers(null);
    setPartnerRunner(null);
    setPartnerRunners([]);
    setActiveRunTitle('SOLO RUN');
    setActiveRunType('SOLO');
    setOfflineConfig(null);
  };

  return (
    <SoloRunContext.Provider
      value={{
        runState,
        metrics,
        routePoints,
        currentLocation,
        actualRoute,
        plannedRoute,
        countdownValue,
        lastRunSummary,
        errorMessage,
        activeRunTitle,
        activeRunType,
        offlineConfig,
        activePartner,
        activeCrewMembers,
        partnerRunner,
        partnerRunners,
        duoSessionId,
        duoSession,
        groupSessionId,
        groupSession,
        isDuoWaitingForPartner,
        isGroupWaitingForPartners,
        groupAcceptedCount,
        groupTotalInvitedCount,
        startPreparation,
        startOfflinePreparation,
        startCountdown,
        pauseRun,
        resumeRun,
        finishRun,
        saveRun,
        cancelRun,
        resetState,
      }}
    >
      {children}
    </SoloRunContext.Provider>
  );
};

export const useSoloRun = () => {
  const context = useContext(SoloRunContext);
  if (!context) {
    throw new Error('useSoloRun must be used within a SoloRunProvider');
  }
  return context;
};
