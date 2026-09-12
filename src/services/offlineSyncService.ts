import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingRun } from '../types/soloRun';
import { runService } from './runService';

const PENDING_RUNS_KEY = '@jogpal_pending_runs_v1';

export const offlineSyncService = {
  async savePendingRun(run: Omit<PendingRun, 'localId' | 'syncStatus'>): Promise<PendingRun> {
    const pendingRun: PendingRun = {
      ...run,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      syncStatus: 'SYNC_PENDING',
    };

    try {
      const existingStr = await AsyncStorage.getItem(PENDING_RUNS_KEY);
      const existing: PendingRun[] = existingStr ? JSON.parse(existingStr) : [];
      existing.push(pendingRun);
      await AsyncStorage.setItem(PENDING_RUNS_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn('Failed to save run to local offline storage:', err);
    }

    return pendingRun;
  },

  async getPendingRuns(): Promise<PendingRun[]> {
    try {
      const str = await AsyncStorage.getItem(PENDING_RUNS_KEY);
      return str ? JSON.parse(str) : [];
    } catch (err) {
      return [];
    }
  },

  async syncPendingRuns(userId: string): Promise<number> {
    try {
      const pending = await this.getPendingRuns();
      const userPending = pending.filter((r) => r.userId === userId && r.syncStatus === 'SYNC_PENDING');

      if (userPending.length === 0) return 0;

      const remaining: PendingRun[] = [];
      let syncedCount = 0;

      for (const run of pending) {
        if (run.userId === userId && run.syncStatus === 'SYNC_PENDING') {
          try {
            await runService.logRun({
              userId: run.userId,
              title: run.title,
              type: run.type,
              distanceKm: run.distanceKm,
              durationSeconds: run.durationSeconds,
              pace: run.pace,
              createdAt: run.createdAt,
            });
            syncedCount++;
          } catch (err) {
            // Keep in queue if write fails
            remaining.push(run);
          }
        } else {
          remaining.push(run);
        }
      }

      await AsyncStorage.setItem(PENDING_RUNS_KEY, JSON.stringify(remaining));
      return syncedCount;
    } catch (err) {
      console.warn('Offline run synchronization warning:', err);
      return 0;
    }
  },
};
