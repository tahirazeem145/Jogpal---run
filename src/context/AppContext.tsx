import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, updateProfile as updateAuthProfile } from '@firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { runService } from '../services/runService';
import { crewService } from '../services/crewService';
import { sessionService } from '../services/sessionService';
import { UserProfile, RunSession, UpcomingSession, CrewMember, PersonalBest } from '../types/data';

interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  otherRunners: UserProfile[];
  runs: RunSession[];
  weeklyKm: number;
  upcomingSession: UpcomingSession | null;
  crew: CrewMember[];
  personalBests: PersonalBest[];
  isLoading: boolean;
  logNewRun: (distanceKm: number, durationSec: number, pace: string, title?: string, type?: 'SOLO' | 'CREW') => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addCrewMember: (name: string, email?: string, userId?: string) => Promise<void>;
  scheduleSession: (title: string, scheduledAt: string, distanceKm: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [otherRunners, setOtherRunners] = useState<UserProfile[]>([]);
  const [runs, setRuns] = useState<RunSession[]>([]);
  const [weeklyKm, setWeeklyKm] = useState<number>(0);
  const [upcomingSession, setUpcomingSession] = useState<UpcomingSession | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fallback default user ID if not logged in yet
  const activeUserId = user?.uid || 'guest_runner';

  // 1. Listen for Auth Changes
  useEffect(() => {
    const unsubscribeAuth = authService.onAuthChange((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Subscribe to Firestore collections for active user
  useEffect(() => {
    setIsLoading(true);

    // Subscribe to User Profile
    const unsubProfile = userService.subscribeToUserProfile(
      activeUserId,
      (profile) => {
        if (profile) {
          setUserProfile(profile);
        } else {
          // Initialize and save profile in Firestore so other users can see this ID
          const defaultProfile: UserProfile = {
            id: activeUserId,
            displayName: user?.displayName || user?.email?.split('@')[0] || (user?.isAnonymous ? `Runner_${activeUserId.slice(0, 5)}` : 'Runner'),
            email: user?.email || '',
            level: 1,
            streakDays: 0,
            totalDistanceKm: 0,
            totalJogs: 0,
            recordsCount: 0,
            passportUnlockedCount: 0,
            passportTotalCount: 30,
            locationSharing: true,
          };
          if (user?.photoURL) {
            defaultProfile.photoURL = user.photoURL;
          }
          setUserProfile(defaultProfile);
          if (activeUserId && activeUserId !== 'guest_runner') {
            userService.saveUserProfile(activeUserId, defaultProfile).catch(() => {});
          }
        }
      },
      () => {
        // Fallback on error / offline
        setUserProfile({
          id: activeUserId,
          displayName: user?.displayName || user?.email?.split('@')[0] || 'Runner',
          email: user?.email || '',
          level: 1,
          streakDays: 0,
          totalDistanceKm: 0,
          totalJogs: 0,
          recordsCount: 0,
          passportUnlockedCount: 0,
          passportTotalCount: 30,
          locationSharing: true,
        });
      }
    );

    // Subscribe to Runs
    const unsubRuns = runService.subscribeToUserRuns(
      activeUserId,
      (liveRuns) => {
        setRuns(liveRuns);
        const weekly = runService.calculateWeeklyDistance(liveRuns);
        setWeeklyKm(weekly);
        const pbs = runService.calculatePersonalBests(liveRuns);
        setPersonalBests(pbs);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    // Subscribe to All Registered Users in Firestore (Other Runners)
    const unsubAllUsers = userService.subscribeToAllUsers(
      activeUserId,
      (registeredUsers) => {
        const filtered = registeredUsers.filter(
          (u) => u.id !== activeUserId
        );
        setOtherRunners(filtered);
      },
      () => {}
    );

    // Subscribe to User's Personal Crew List
    const unsubCrew = crewService.subscribeToCrew(
      activeUserId,
      (liveCrew) => {
        setCrew(liveCrew);
      },
      () => {}
    );

    // Subscribe to Upcoming Session
    const unsubSession = sessionService.subscribeToUpcomingSession(
      activeUserId,
      (liveSession) => {
        setUpcomingSession(liveSession);
      },
      () => {}
    );

    return () => {
      unsubProfile();
      unsubRuns();
      unsubAllUsers();
      unsubCrew();
      unsubSession();
    };
  }, [activeUserId]);

  // Combined Crew list: User's saved crew + All other registered users from Firestore
  const combinedCrew: CrewMember[] = React.useMemo(() => {
    const map = new Map<string, CrewMember>();
    const EXCLUDED_IDS = [activeUserId];

    // 1. Add all other real registered users from Firestore
    otherRunners.forEach((r) => {
      if (EXCLUDED_IDS.includes(r.id)) return;
      const runnerName = r.displayName || r.email?.split('@')[0] || `Runner ${r.id.slice(0, 4)}`;
      map.set(r.id, {
        id: r.id,
        userId: r.id,
        name: runnerName,
        initial: (runnerName.trim().charAt(0) || 'R').toUpperCase(),
        email: r.email,
        level: r.level || 1,
        totalDistanceKm: r.totalDistanceKm || 0,
        streakDays: r.streakDays || 0,
        rank: r.rank || 'Runner',
        avatarUrl: r.photoURL,
        status: 'ACTIVE',
        isOnline: true,
      });
    });

    // 2. Add any manually added crew members
    crew.forEach((c) => {
      if (EXCLUDED_IDS.includes(c.id) || (c.userId && EXCLUDED_IDS.includes(c.userId))) return;
      if (!map.has(c.id) && !map.has(c.userId || '')) {
        map.set(c.id, c);
      }
    });

    // Return strictly real users from Firestore or empty array
    return Array.from(map.values());
  }, [otherRunners, crew]);

  // Actions
  const logNewRun = async (
    distanceKm: number,
    durationSec: number,
    pace: string,
    title = 'SOLO RUN',
    type: 'SOLO' | 'CREW' = 'SOLO'
  ) => {
    const newRun: Omit<RunSession, 'id'> = {
      userId: activeUserId,
      title,
      type,
      distanceKm,
      durationSeconds: durationSec,
      pace,
      createdAt: new Date().toISOString(),
    };
    await runService.logRun(newRun);

    // Update profile aggregates
    if (userProfile) {
      const newTotalKm = Math.round(((userProfile.totalDistanceKm || 0) + distanceKm) * 10) / 10;
      const newJogs = (userProfile.totalJogs || 0) + 1;
      await userService.saveUserProfile(activeUserId, {
        totalDistanceKm: newTotalKm,
        totalJogs: newJogs,
      });
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    // 1. Update Firestore
    await userService.saveUserProfile(activeUserId, data);
    // 2. Update local state immediately
    setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
    // 3. Update Firebase Auth user if present
    if (auth.currentUser) {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (data.displayName !== undefined) authUpdates.displayName = data.displayName;
      if (data.photoURL !== undefined) authUpdates.photoURL = data.photoURL;
      if (Object.keys(authUpdates).length > 0) {
        try {
          await updateAuthProfile(auth.currentUser, authUpdates);
        } catch (err) {
          console.log('Firebase Auth profile update warning:', err);
        }
      }
    }
  };

  const addCrewMember = async (name: string, email?: string, userId?: string) => {
    const targetUserId = userId || (name.startsWith('usr_') || name.length > 10 ? name : undefined);
    let resolvedName = name;
    let level = 1;
    let totalDistanceKm = 0;
    let streakDays = 0;
    let rank = 'Runner';

    // If userId is provided or entered, fetch the real user profile from Firestore
    if (targetUserId) {
      try {
        const fetched = await userService.getUserProfile(targetUserId);
        if (fetched) {
          resolvedName = fetched.displayName || name || fetched.email?.split('@')[0] || `Runner ${targetUserId.slice(0, 4)}`;
          level = fetched.level || 1;
          totalDistanceKm = fetched.totalDistanceKm || 0;
          streakDays = fetched.streakDays || 0;
          rank = fetched.rank || 'Runner';
        }
      } catch (err) {
        // use provided fallback values
      }
    }

    const memberId = targetUserId || `crew_${Date.now()}`;
    const newMember: CrewMember = {
      id: memberId,
      userId: targetUserId || memberId,
      name: resolvedName,
      initial: (resolvedName.trim().charAt(0) || 'R').toUpperCase(),
      email: email || '',
      level,
      totalDistanceKm,
      streakDays,
      rank,
      status: 'ACTIVE',
      isOnline: true,
    };
    await crewService.addCrewMember(activeUserId, newMember);
  };

  const scheduleSession = async (title: string, scheduledAt: string, distanceKm: string) => {
    await sessionService.scheduleSession(activeUserId, {
      title,
      scheduledAt,
      distanceKm,
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        otherRunners,
        runs,
        weeklyKm,
        upcomingSession,
        crew: combinedCrew,
        personalBests,
        isLoading,
        logNewRun,
        updateProfile,
        addCrewMember,
        scheduleSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
