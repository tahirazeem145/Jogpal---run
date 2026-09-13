import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, Alert } from 'react-native';
import { RunState, GPSPoint, SoloRunMetrics, PendingRun, LatLng } from '../types/soloRun';
import { locationService, isValidGPSPoint, validateGPSPoint, isValidMapLocation, calculateHaversineDistanceKm, calculateRollingPaceString, getAccuracyTier } from '../services/locationService';
import { offlineSyncService } from '../services/offlineSyncService';
import { useApp } from './AppContext';

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
  startPreparation: (title?: string, type?: 'SOLO' | 'CREW') => Promise<void>;
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
  const activeUserId = user?.uid || userProfile?.id || 'guest_runner';

  const [runState, setRunState] = useState<RunState>('IDLE');
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

  // 3. TWO-STAGE PARALLEL LOCATION ACQUISITION
  const startPreparation = async (title = 'SOLO RUN', type: 'SOLO' | 'CREW' = 'SOLO') => {
    const prepStart = Date.now();
    prepStartTimeRef.current = prepStart;
    titleRef.current = title;
    typeRef.current = type;
    setActiveRunTitle(title);
    setActiveRunType(type);

    console.log(`[TELEMETRY] LOCATION_REQUEST_STARTED for ${title}`);
    setRunState('PREPARING');
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
      setRunState('ERROR');
      setErrorMessage('Location permission was denied. Enable GPS in device settings.');
      return;
    }

    const servicesEnabled = await locationService.checkServicesEnabled();
    if (!servicesEnabled) {
      setRunState('ERROR');
      setErrorMessage('Location services (GPS) are disabled on this device. Please turn on GPS.');
      return;
    }

    setRunState('GPS_SEARCHING');

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

        setMetrics((prev) => ({
          ...prev,
          stage1Ready: true,
          firstLocationLatencyMs: latency,
          gpsStatus: prev.gpsStatus === 'SEARCHING' ? 'READY' : prev.gpsStatus,
        }));

        // Enable GPS_READY stage immediately so user can press START RUN without waiting
        setRunState((curr) => (curr === 'GPS_SEARCHING' || curr === 'PREPARING' ? 'GPS_READY' : curr));
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

    setMetrics((prev) => {
      let gpsStatus: SoloRunMetrics['gpsStatus'] = 'SEARCHING';
      if (accuracy !== null) {
        if (accuracy <= 25) gpsStatus = 'READY';
        else if (accuracy <= 60) gpsStatus = 'GOOD';
        else if (accuracy <= 120) gpsStatus = 'POOR';
        else gpsStatus = 'LOST';
      }

      if (runState === 'GPS_SEARCHING' && (accuracy === null || accuracy <= 80)) {
        setRunState('GPS_READY');
      }

      return {
        ...prev,
        gpsAccuracy: accuracy,
        gpsStatus,
        currentSpeedKmH: point.speed !== null && point.speed > 0 ? Math.round(point.speed * 3.6 * 10) / 10 : prev.currentSpeedKmH,
      };
    });

    // If ACTIVE or COUNTDOWN and NOT PAUSED
    if (!isPausedRef.current && (runState === 'ACTIVE' || runState === 'COUNTDOWN')) {
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

        // Accumulate distance whenever displacement >= 1.5 meters (0.0015 km)
        if (segKm >= 0.0015) {
          lastAcceptedPointRef.current = point;
          actualRouteRef.current.push(newCoord);
          setActualRoute([...actualRouteRef.current]);

          accumulatedDistanceKmRef.current += segKm;
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
    if (runState !== 'GPS_READY' && runState !== 'GPS_SEARCHING') return;
    setRunState('COUNTDOWN');
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
    setRunState('ACTIVE');
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
    if (runState !== 'ACTIVE') return;
    setRunState('PAUSED');
    isPausedRef.current = true;
  };

  // 7. Resume Run
  const resumeRun = () => {
    if (runState !== 'PAUSED') return;
    setRunState('ACTIVE');
    isPausedRef.current = false;
    // Reset reference point on resume so paused physical movement is NOT counted
    lastAcceptedPointRef.current = null;
  };

  const isCompletingRef = useRef<boolean>(false);
  const isSavedRef = useRef<boolean>(false);

  // 8. Finish Run (Idempotent: executes exactly once per session)
  const finishRun = async () => {
    if (isCompletingRef.current || (runState !== 'ACTIVE' && runState !== 'PAUSED')) return;
    isCompletingRef.current = true;
    setRunState('COMPLETING');
    isPausedRef.current = true;
    stopTimer();
    stopLocationWatching();

    const finalDistance = Math.round(accumulatedDistanceKmRef.current * 100) / 100;
    const finalDuration = accumulatedDurationRef.current;
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
  };

  // 9. Save Run (Idempotent: saves local first, syncs Firebase separately)
  const saveRun = async () => {
    if (isSavedRef.current || !lastRunSummary || runState === 'SAVING' || runState === 'SAVED') return;
    isSavedRef.current = true;
    setRunState('SAVING');

    try {
      await logNewRun(
        lastRunSummary.distanceKm,
        lastRunSummary.durationSeconds,
        lastRunSummary.pace,
        lastRunSummary.title,
        lastRunSummary.type,
        {
          route: lastRunSummary.actualRoute,
          avgSpeedKmH: lastRunSummary.avgSpeedKmH,
          maxSpeedKmH: lastRunSummary.maxSpeedKmH,
          calories: Math.round(lastRunSummary.distanceKm * 62),
          startLocation:
            lastRunSummary.actualRoute && lastRunSummary.actualRoute.length > 0
              ? lastRunSummary.actualRoute[0]
              : undefined,
          endLocation:
            lastRunSummary.actualRoute && lastRunSummary.actualRoute.length > 1
              ? lastRunSummary.actualRoute[lastRunSummary.actualRoute.length - 1]
              : undefined,
        }
      );
      setRunState('SAVED');
      offlineSyncService.syncPendingRuns(activeUserId).catch(() => {});
    } catch (err) {
      await offlineSyncService.savePendingRun({
        userId: lastRunSummary.userId,
        title: lastRunSummary.title,
        type: lastRunSummary.type,
        distanceKm: lastRunSummary.distanceKm,
        durationSeconds: lastRunSummary.durationSeconds,
        pace: lastRunSummary.pace,
        createdAt: lastRunSummary.createdAt,
        plannedRoute: lastRunSummary.plannedRoute,
        actualRoute: lastRunSummary.actualRoute,
        trackingIntegrityScore: lastRunSummary.trackingIntegrityScore,
      });
      setRunState('SYNC_PENDING');
    }
  };

  // 10. Cancel & Reset
  const cancelRun = () => {
    stopTimer();
    stopLocationWatching();
    resetState();
  };

  const resetState = () => {
    setRunState('IDLE');
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
    setActiveRunTitle('SOLO RUN');
    setActiveRunType('SOLO');
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
        startPreparation,
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
