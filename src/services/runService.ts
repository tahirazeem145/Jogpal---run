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

  // Derive personal records dynamically from user run history
  calculatePersonalBests(runs: RunSession[]): PersonalBest[] {
    if (!runs || runs.length === 0) return [];

    let best5k: RunSession | null = null;
    let best10k: RunSession | null = null;
    let longestRun: RunSession | null = null;

    runs.forEach((r) => {
      if (!longestRun || r.distanceKm > longestRun.distanceKm) {
        longestRun = r;
      }
      if (r.distanceKm >= 5) {
        if (!best5k || r.durationSeconds < best5k.durationSeconds) {
          best5k = r;
        }
      }
      if (r.distanceKm >= 10) {
        if (!best10k || r.durationSeconds < best10k.durationSeconds) {
          best10k = r;
        }
      }
    });

    const records: PersonalBest[] = [];
    if (best5k) {
      records.push({
        id: 'pb-5k',
        category: '5 KM',
        record: `${Math.floor((best5k as RunSession).durationSeconds / 60)}:${((best5k as RunSession).durationSeconds % 60).toString().padStart(2, '0')}`,
        pace: (best5k as RunSession).pace,
        date: new Date((best5k as RunSession).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    if (best10k) {
      records.push({
        id: 'pb-10k',
        category: '10 KM',
        record: `${Math.floor((best10k as RunSession).durationSeconds / 60)}:${((best10k as RunSession).durationSeconds % 60).toString().padStart(2, '0')}`,
        pace: (best10k as RunSession).pace,
        date: new Date((best10k as RunSession).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    if (longestRun) {
      records.push({
        id: 'pb-longest',
        category: 'LONGEST RUN',
        record: `${(longestRun as RunSession).distanceKm} KM`,
        pace: (longestRun as RunSession).pace,
        date: new Date((longestRun as RunSession).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }

    return records;
  },
};
