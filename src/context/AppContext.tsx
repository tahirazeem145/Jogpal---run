import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, updateProfile as updateAuthProfile } from '@firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { runService } from '../services/runService';
import { crewService } from '../services/crewService';
import { friendService } from '../services/friendService';
import { sessionService } from '../services/sessionService';
import { requestService } from '../services/requestService';
import { UserProfile, RunSession, UpcomingSession, CrewMember, PersonalBest, CrewRequest } from '../types/data';

interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  otherRunners: UserProfile[];
  runs: RunSession[];
  weeklyKm: number;
  upcomingSession: UpcomingSession | null;
  crew: CrewMember[];
  friends: CrewMember[];
  sentRequestIds: string[];
  personalBests: PersonalBest[];
  incomingRequests: CrewRequest[];
  unreadRequestCount: number;
  isLoading: boolean;
  logNewRun: (distanceKm: number, durationSec: number, pace: string, title?: string, type?: 'SOLO' | 'CREW') => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addCrewMember: (name: string, email?: string, userId?: string) => Promise<void>;
  scheduleSession: (title: string, scheduledAt: string, distanceKm: string) => Promise<void>;
  sendCrewRequest: (toUserId: string, type?: 'CREW_INVITE' | 'RUN_INVITE') => Promise<{ success: boolean; message: string }>;
  acceptCrewRequest: (request: CrewRequest) => Promise<void>;
  rejectCrewRequest: (requestId: string, fromUserId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allRegisteredRunners, setAllRegisteredRunners] = useState<UserProfile[]>([]);
  const [runs, setRuns] = useState<RunSession[]>([]);
  const [weeklyKm, setWeeklyKm] = useState<number>(0);
  const [upcomingSession, setUpcomingSession] = useState<UpcomingSession | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [friends, setFriends] = useState<CrewMember[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<CrewRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const unreadRequestCount = incomingRequests.length;

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

    // Subscribe to All Registered Users in Firestore
    const unsubAllUsers = userService.subscribeToAllUsers(
      activeUserId,
      (registeredUsers) => {
        const filtered = registeredUsers.filter(
          (u) => u.id !== activeUserId
        );
        setAllRegisteredRunners(filtered);
      },
      () => {}
    );

    // Subscribe to User's Crew List
    const unsubCrew = crewService.subscribeToCrew(
      activeUserId,
      (liveCrew) => {
        setCrew(liveCrew);
      },
      () => {}
    );

    // Subscribe to User's Accepted Friends List (Real-time Accepted Connections)
    const unsubFriends = friendService.subscribeToFriends(
      activeUserId,
      (liveFriends) => {
        setFriends(liveFriends);
      },
      () => {}
    );

    // Subscribe to Outgoing Sent Requests
    const unsubSentRequests = requestService.subscribeToSentRequests(
      activeUserId,
      (sentIds) => {
        setSentRequestIds(sentIds);
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

    // Subscribe to Incoming Requests in Real-Time
    const unsubRequests = requestService.subscribeToIncomingRequests(
      activeUserId,
      (liveRequests) => {
        setIncomingRequests(liveRequests);
      },
      () => {}
    );

    return () => {
      unsubProfile();
      unsubRuns();
      unsubAllUsers();
      unsubCrew();
      unsubFriends();
      unsubSentRequests();
      unsubSession();
      unsubRequests();
    };
  }, [activeUserId]);

  // Discoverable Other Runners (Runners in Firestore who are NOT self AND NOT in accepted Friends)
  const discoverableRunners: UserProfile[] = React.useMemo(() => {
    const friendIdSet = new Set<string>();
    friends.forEach((f) => {
      friendIdSet.add(f.id);
      if (f.userId) friendIdSet.add(f.userId);
    });

    return allRegisteredRunners.filter((r) => !friendIdSet.has(r.id) && r.id !== activeUserId);
  }, [allRegisteredRunners, friends, activeUserId]);

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

    const memberId = targetUserId || `friend_${Date.now()}`;
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
    await friendService.addFriend(activeUserId, newMember);
  };

  const scheduleSession = async (title: string, scheduledAt: string, distanceKm: string) => {
    await sessionService.scheduleSession(activeUserId, {
      title,
      scheduledAt,
      distanceKm,
    });
  };

  const sendCrewRequest = async (
    toUserId: string,
    type: 'CREW_INVITE' | 'RUN_INVITE' = 'CREW_INVITE'
  ) => {
    if (!userProfile) {
      return { success: false, message: 'User profile not ready' };
    }
    const result = await requestService.sendCrewRequest(userProfile, toUserId, type);
    if (result.success) {
      setSentRequestIds((prev) => (prev.includes(toUserId) ? prev : [...prev, toUserId]));
    }
    return result;
  };

  const acceptCrewRequest = async (request: CrewRequest) => {
    if (!userProfile) return;
    await requestService.acceptCrewRequest(request, userProfile);
  };

  const rejectCrewRequest = async (requestId: string, fromUserId?: string) => {
    await requestService.rejectCrewRequest(activeUserId, requestId, fromUserId);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        otherRunners: discoverableRunners,
        runs,
        weeklyKm,
        upcomingSession,
        crew,
        friends,
        sentRequestIds,
        personalBests,
        incomingRequests,
        unreadRequestCount,
        isLoading,
        logNewRun,
        updateProfile,
        addCrewMember,
        scheduleSession,
        sendCrewRequest,
        acceptCrewRequest,
        rejectCrewRequest,
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
