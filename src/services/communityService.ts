import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from '@firebase/firestore';
import { db } from '../config/firebase';
import {
  Community,
  CommunityEvent,
  CommunityJoinRequest,
  CoverTheme,
  CoverThemeId,
} from '../types/community';

export const COVER_THEMES: Record<CoverThemeId, CoverTheme> = {
  CYBER_NEON: {
    id: 'CYBER_NEON',
    name: 'Cyber Neon',
    primaryColor: '#00F2FE',
    secondaryColor: '#4FACFE',
    accentColor: '#00FF88',
    gradientColors: ['#00F2FE', '#4FACFE', '#000000'],
    textColor: '#FFFFFF',
    description: 'Electric cyan & vivid blue futuristic neon vibe',
  },
  NEON_SUNSET: {
    id: 'NEON_SUNSET',
    name: 'Neon Sunset',
    primaryColor: '#FF0844',
    secondaryColor: '#FFB199',
    accentColor: '#FFD700',
    gradientColors: ['#FF0844', '#FFB199', '#1A0826'],
    textColor: '#FFFFFF',
    description: 'Hot sunset pink & amber flame energy',
  },
  ELECTRIC_GREEN: {
    id: 'ELECTRIC_GREEN',
    name: 'Electric Green',
    primaryColor: '#00FF88',
    secondaryColor: '#00B894',
    accentColor: '#00F2FE',
    gradientColors: ['#00FF88', '#00B894', '#0A1E13'],
    textColor: '#FFFFFF',
    description: 'Hyper vibrant neon lime & matrix cyber green',
  },
  MIDNIGHT_BLUE: {
    id: 'MIDNIGHT_BLUE',
    name: 'Midnight Blue',
    primaryColor: '#3A7BD5',
    secondaryColor: '#3A6073',
    accentColor: '#00F2FE',
    gradientColors: ['#3A7BD5', '#3A6073', '#091526'],
    textColor: '#FFFFFF',
    description: 'Deep sapphire & arctic midnight sky styling',
  },
  SOLAR_GOLD: {
    id: 'SOLAR_GOLD',
    name: 'Solar Gold',
    primaryColor: '#FFD700',
    secondaryColor: '#FF8C00',
    accentColor: '#00FF88',
    gradientColors: ['#FFD700', '#FF8C00', '#261C04'],
    textColor: '#FFFFFF',
    description: 'Radiant amber gold & warm solar flare theme',
  },
  OBSIDIAN_DARK: {
    id: 'OBSIDIAN_DARK',
    name: 'Obsidian Stealth',
    primaryColor: '#A0A0A0',
    secondaryColor: '#4A4A4A',
    accentColor: '#00FF88',
    gradientColors: ['#4A4A4A', '#1C1C1C', '#000000'],
    textColor: '#FFFFFF',
    description: 'Sleek stealth dark obsidian with subtle neon highlights',
  },
};

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

export const communityService = {
  // Subscribe to real existing Communities in Firestore ONLY
  subscribeToCommunities(
    onUpdate: (communities: Community[]) => void,
    onError?: (error: Error) => void
  ) {
    const commsRef = collection(db, 'communities');
    return onSnapshot(
      commsRef,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate([]);
        } else {
          const liveComms: Community[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Community[];
          onUpdate(liveComms);
        }
      },
      (error) => {
        console.warn('Firestore community subscription error:', error);
        onUpdate([]);
        if (onError) onError(error);
      }
    );
  },

  // Create a new Community
  async createCommunity(
    data: Omit<Community, 'id' | 'createdAt' | 'membersCount' | 'memberIds' | 'pendingRequestIds'>
  ): Promise<Community> {
    const newId = `comm_${Date.now()}`;
    const newCommunity: Community = {
      ...data,
      id: newId,
      membersCount: 1,
      memberIds: [data.hostId],
      pendingRequestIds: [],
      events: data.events || [],
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'communities', newId);
      await setDoc(docRef, sanitizeForFirestore(newCommunity));
    } catch (err) {
      console.warn('Error creating community in Firestore:', err);
    }

    return newCommunity;
  },

  // Request to Join a Community
  async joinOrRequestCommunity(
    community: Community,
    userId: string,
    userName: string,
    userAvatar?: string
  ): Promise<{ success: boolean; isJoined: boolean; message: string }> {
    const commRef = doc(db, 'communities', community.id);

    if (community.memberIds.includes(userId)) {
      return { success: true, isJoined: true, message: 'You are already a member of this community!' };
    }

    if (community.isPublic) {
      // Instant Join
      try {
        await updateDoc(commRef, {
          memberIds: arrayUnion(userId),
          membersCount: (community.membersCount || community.memberIds.length) + 1,
        });
      } catch (err) {
        console.warn('Firestore update error:', err);
      }
      return {
        success: true,
        isJoined: true,
        message: `Welcome! You are now a member of ${community.name}.`,
      };
    } else {
      // Request Approval required
      try {
        await updateDoc(commRef, {
          pendingRequestIds: arrayUnion(userId),
        });

        // Save detailed join request doc in subcollection
        const reqDoc = doc(db, 'communities', community.id, 'joinRequests', userId);
        const joinReq: CommunityJoinRequest = {
          id: `req_${Date.now()}`,
          communityId: community.id,
          userId,
          userName,
          userAvatar,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        await setDoc(reqDoc, sanitizeForFirestore(joinReq));
      } catch (err) {
        console.warn('Firestore join request error:', err);
      }

      return {
        success: true,
        isJoined: false,
        message: `Join request sent to ${community.hostName}. You will be notified once approved!`,
      };
    }
  },

  // Host approves join request
  async approveJoinRequest(communityId: string, userId: string): Promise<void> {
    const commRef = doc(db, 'communities', communityId);
    try {
      await updateDoc(commRef, {
        memberIds: arrayUnion(userId),
        pendingRequestIds: arrayRemove(userId),
      });

      const reqDoc = doc(db, 'communities', communityId, 'joinRequests', userId);
      await updateDoc(reqDoc, { status: 'APPROVED' });
    } catch (err) {
      console.warn('Error approving join request:', err);
    }
  },

  // Host rejects join request
  async rejectJoinRequest(communityId: string, userId: string): Promise<void> {
    const commRef = doc(db, 'communities', communityId);
    try {
      await updateDoc(commRef, {
        pendingRequestIds: arrayRemove(userId),
      });

      const reqDoc = doc(db, 'communities', communityId, 'joinRequests', userId);
      await updateDoc(reqDoc, { status: 'REJECTED' });
    } catch (err) {
      console.warn('Error rejecting join request:', err);
    }
  },

  // Host creates an event in the community
  async hostCommunityEvent(
    communityId: string,
    eventData: Omit<CommunityEvent, 'id' | 'communityId' | 'createdAt' | 'participantIds'>
  ): Promise<CommunityEvent> {
    const newEvent: CommunityEvent = {
      ...eventData,
      id: `event_${Date.now()}`,
      communityId,
      participantIds: [eventData.hostId],
      createdAt: new Date().toISOString(),
    };

    try {
      const commRef = doc(db, 'communities', communityId);
      const snap = await getDoc(commRef);
      if (snap.exists()) {
        const existingEvents: CommunityEvent[] = snap.data().events || [];
        await updateDoc(commRef, {
          events: [...existingEvents, sanitizeForFirestore(newEvent)],
        });
      }
    } catch (err) {
      console.warn('Firestore event add error:', err);
    }

    return newEvent;
  },

  // Member toggles participation in a community event
  async toggleEventParticipation(
    communityId: string,
    eventId: string,
    userId: string,
    currentEvents: CommunityEvent[] = []
  ): Promise<CommunityEvent[]> {
    const updatedEvents = currentEvents.map((evt) => {
      if (evt.id === eventId) {
        const isParticipating = evt.participantIds.includes(userId);
        const updatedParticipants = isParticipating
          ? evt.participantIds.filter((id) => id !== userId)
          : [...evt.participantIds, userId];
        return {
          ...evt,
          participantIds: updatedParticipants,
        };
      }
      return evt;
    });

    try {
      const commRef = doc(db, 'communities', communityId);
      await updateDoc(commRef, {
        events: updatedEvents.map((e) => sanitizeForFirestore(e)),
      });
    } catch (err) {
      console.warn('Error updating event participation:', err);
    }

    return updatedEvents;
  },
};
