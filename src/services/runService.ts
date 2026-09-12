import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from '@firebase/firestore';
import { db } from '../config/firebase';
import { RunSession, PersonalBest } from '../types/data';

function sanitizeForFirestore<T extends Record<string, any>>(data: T): T {
  const clean: any = {};
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  });
  return clean;
}

export interface RunningStatsOverview {
  totalRuns: number;
  totalDistanceKm: number;
  totalTimeFormatted: string;
  averagePace: string;
  longestRunKm: number;
}

export interface PersonalBestItem extends PersonalBest {
  title: string;
  subtitle: string;
  value: string;
  iconName: string;
}

export interface StreakConsistencyStats {
  currentStreak: number;
  longestStreak: number;
  weekDaysActive: { day: string; active: boolean; isToday: boolean }[];
  activeDaysCount: number;
  monthlyConsistencyPercent: number;
}

export const runService = {
  // Subscribe to all runs for a specific user, sorted by most recent
  subscribeToUserRuns(
    userId: string,
    onUpdate: (runs: RunSession[]) => void,
    onError?: (error: Error) => void
  ) {
    const runsCollection = collection(db, 'runs');
    const q = query(
      runsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const runs: RunSession[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RunSession[];
        onUpdate(runs);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Log a new run session to Firestore
  async logRun(run: Omit<RunSession, 'id'>) {
    const runsCollection = collection(db, 'runs');
    const payload = {
      ...run,
      createdAt: run.createdAt || new Date().toISOString(),
    };
    const sanitized = sanitizeForFirestore(payload);
    return await addDoc(runsCollection, sanitized);
  },

  // Calculate weekly momentum distance (sum of all runs in current week)
  calculateWeeklyDistance(runs: RunSession[]): number {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDay + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyRuns = runs.filter((run) => {
      const runDate = new Date(run.createdAt);
      return runDate >= startOfWeek;
    });

    const totalKm = weeklyRuns.reduce((sum, run) => sum + (run.distanceKm || 0), 0);
    return Math.round(totalKm * 10) / 10;
  },

  // Calculate Running Stats Overview
  calculateRunningStats(runs: RunSession[]): RunningStatsOverview {
    if (!runs || runs.length === 0) {
      return {
        totalRuns: 0,
        totalDistanceKm: 0,
        totalTimeFormatted: '0m',
        averagePace: '--:--',
        longestRunKm: 0,
      };
    }

    const totalRuns = runs.length;
    let totalKm = 0;
    let totalSeconds = 0;
    let longestKm = 0;

    runs.forEach((r) => {
      const km = r.distanceKm || 0;
      const sec = r.durationSeconds || 0;
      totalKm += km;
      totalSeconds += sec;
      if (km > longestKm) longestKm = km;
    });

    // Format Total Time
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const totalTimeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    // Average Pace
    let averagePace = '--:--';
    if (totalKm > 0) {
      const paceSeconds = Math.round(totalSeconds / totalKm);
      const paceMin = Math.floor(paceSeconds / 60);
      const paceSec = paceSeconds % 60;
      averagePace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
    }

    return {
      totalRuns,
      totalDistanceKm: Math.round(totalKm * 10) / 10,
      totalTimeFormatted,
      averagePace,
      longestRunKm: Math.round(longestKm * 10) / 10,
    };
  },

  // Derive Comprehensive Personal Bests 🏆
  calculatePersonalBests(runs: RunSession[]): PersonalBestItem[] {
    let best1k: RunSession | null = null;
    let best3k: RunSession | null = null;
    let best5k: RunSession | null = null;
    let longestRun: RunSession | null = null;
    let bestPaceRun: RunSession | null = null;
    let bestPaceSec = Infinity;

    if (runs && runs.length > 0) {
      runs.forEach((r) => {
        const km = r.distanceKm || 0;
        const sec = r.durationSeconds || 0;

        // Longest Distance
        if (!longestRun || km > (longestRun as RunSession).distanceKm) {
          longestRun = r;
        }

        // Best Overall Pace
        if (km >= 0.5 && sec > 0) {
          const pacePerKm = sec / km;
          if (pacePerKm < bestPaceSec) {
            bestPaceSec = pacePerKm;
            bestPaceRun = r;
          }
        }

        // Fastest 1K
        if (km >= 1) {
          if (!best1k || sec / km < ((best1k as RunSession).durationSeconds / (best1k as RunSession).distanceKm)) {
            best1k = r;
          }
        }

        // Fastest 3K
        if (km >= 3) {
          if (!best3k || sec / km < ((best3k as RunSession).durationSeconds / (best3k as RunSession).distanceKm)) {
            best3k = r;
          }
        }

        // Fastest 5K
        if (km >= 5) {
          if (!best5k || sec / km < ((best5k as RunSession).durationSeconds / (best5k as RunSession).distanceKm)) {
            best5k = r;
          }
        }
      });
    }

    const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatDate = (iso: string) => {
      try {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch (e) {
        return 'Recent';
      }
    };

    const pb1kVal = best1k ? formatDuration(Math.round(((best1k as RunSession).durationSeconds / (best1k as RunSession).distanceKm))) : '--:--';
    const pb3kVal = best3k ? formatDuration(Math.round(((best3k as RunSession).durationSeconds / (best3k as RunSession).distanceKm) * 3)) : '--:--';
    const pb5kVal = best5k ? formatDuration(Math.round((best5k as RunSession).durationSeconds)) : '--:--';
    const pbLongVal = longestRun ? `${(longestRun as RunSession).distanceKm.toFixed(1)} KM` : '-- KM';
    const pbPaceVal = bestPaceRun ? `${(bestPaceRun as RunSession).pace}` : '--:--';

    return [
      {
        id: 'pb-1k',
        category: '1 KM',
        record: pb1kVal,
        title: 'FASTEST 1K',
        subtitle: '1 Kilometer Sprint',
        value: pb1kVal,
        pace: best1k ? `${(best1k as RunSession).pace}` : undefined,
        date: best1k ? formatDate((best1k as RunSession).createdAt) : undefined,
        iconName: 'flash-outline',
        unlocked: !!best1k,
      },
      {
        id: 'pb-3k',
        category: '3 KM',
        record: pb3kVal,
        title: 'FASTEST 3K',
        subtitle: '3 KM Tempo Pace',
        value: pb3kVal,
        pace: best3k ? `${(best3k as RunSession).pace}` : undefined,
        date: best3k ? formatDate((best3k as RunSession).createdAt) : undefined,
        iconName: 'rocket-outline',
        unlocked: !!best3k,
      },
      {
        id: 'pb-5k',
        category: '5 KM',
        record: pb5kVal,
        title: 'FASTEST 5K',
        subtitle: '5 Kilometer Benchmark',
        value: pb5kVal,
        pace: best5k ? `${(best5k as RunSession).pace}` : undefined,
        date: best5k ? formatDate((best5k as RunSession).createdAt) : undefined,
        iconName: 'trophy-outline',
        unlocked: !!best5k,
      },
      {
        id: 'pb-longest',
        category: 'LONGEST RUN',
        record: pbLongVal,
        title: 'LONGEST DISTANCE',
        subtitle: 'Greatest Endurance Run',
        value: pbLongVal,
        pace: longestRun ? `${(longestRun as RunSession).pace}` : undefined,
        date: longestRun ? formatDate((longestRun as RunSession).createdAt) : undefined,
        iconName: 'map-outline',
        unlocked: !!longestRun,
      },
      {
        id: 'pb-pace',
        category: 'BEST PACE',
        record: pbPaceVal,
        title: 'BEST PACE',
        subtitle: 'Peak Speed Record',
        value: pbPaceVal,
        date: bestPaceRun ? formatDate((bestPaceRun as RunSession).createdAt) : undefined,
        iconName: 'speedometer-outline',
        unlocked: !!bestPaceRun,
      },
    ];
  },

  // Calculate Streak & Consistency 🔥
  calculateStreakAndConsistency(runs: RunSession[]): StreakConsistencyStats {
    const daysName = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const now = new Date();
    const currentDayIdx = (now.getDay() + 6) % 7; // Monday is 0, Sunday is 6

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayIdx);
    startOfWeek.setHours(0, 0, 0, 0);

    // Days of current week
    const weekDaysActive = daysName.map((day, idx) => {
      const targetDate = new Date(startOfWeek);
      targetDate.setDate(startOfWeek.getDate() + idx);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();

      const hasRun = runs.some((r) => {
        const rd = new Date(r.createdAt);
        return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d;
      });

      return {
        day,
        active: hasRun,
        isToday: idx === currentDayIdx,
      };
    });

    const activeDaysCount = weekDaysActive.filter((w) => w.active).length;

    // Calculate Consecutive Day Streak
    const uniqueDates = Array.from(
      new Set(
        runs.map((r) => {
          const d = new Date(r.createdAt);
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        })
      )
    ).sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;

    if (uniqueDates.length > 0) {
      const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yestStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

      // Check if ran today or yesterday to continue streak
      if (uniqueDates[0] === todayStr || uniqueDates[0] === yestStr) {
        let checkDate = uniqueDates[0] === todayStr ? now : yesterday;
        for (const dateStr of uniqueDates) {
          const expected = `${checkDate.getFullYear()}-${(checkDate.getMonth() + 1).toString().padStart(2, '0')}-${checkDate.getDate().toString().padStart(2, '0')}`;
          if (dateStr === expected) {
            currentStreak++;
            checkDate = new Date(checkDate);
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      longestStreak = Math.max(currentStreak, runs.length > 0 ? Math.min(runs.length, 14) : 0);
    }

    // Monthly consistency estimation
    const runsThisMonth = runs.filter((r) => {
      const rd = new Date(r.createdAt);
      return rd.getFullYear() === now.getFullYear() && rd.getMonth() === now.getMonth();
    }).length;

    const monthlyConsistencyPercent = Math.min(Math.round((runsThisMonth / Math.max(now.getDate(), 1)) * 100), 100);

    return {
      currentStreak,
      longestStreak,
      weekDaysActive,
      activeDaysCount,
      monthlyConsistencyPercent,
    };
  },
};
