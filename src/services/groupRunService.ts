import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from '@firebase/firestore';
import { db } from '../config/firebase';
import {
  GroupRunSession,
  GroupParticipantTelemetry,
  UserProfile,
  CrewMember,
  GroupInvitedFriend,
} from '../types/data';
import { requestService } from './requestService';

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

export const groupRunService = {
  // 1. Host creates a multi-participant Group Run session and sends invitations to all selected friends
  async createGroupSession(
    hostProfile: UserProfile,
    invitedFriends: CrewMember[],
    title?: string
  ): Promise<{ session: GroupRunSession }> {
    const sessionId = `group_${hostProfile.id}_${Date.now()}`;
    const sessionDocRef = doc(db, 'group_sessions', sessionId);

    const invitedUserIds: string[] = [];
    const invitedFriendsMap: Record<string, GroupInvitedFriend> = {};

    invitedFriends.forEach((friend) => {
      const uid = friend.userId || friend.id;
      invitedUserIds.push(uid);
      invitedFriendsMap[uid] = {
        userId: uid,
        name: friend.name || 'Runner',
        avatarUrl: friend.photoURL || friend.avatarUrl || '',
        initial: (friend.name?.trim().charAt(0) || friend.initial || 'R').toUpperCase(),
        status: 'INVITED',
      };
    });

    const sessionTitle = title || `SQUAD RUN • ${invitedFriends.length + 1} RUNNERS`;

    const sessionData: GroupRunSession = {
      id: sessionId,
      hostUserId: hostProfile.id,
      hostName: hostProfile.displayName || hostProfile.email?.split('@')[0] || 'Runner',
      hostAvatar: hostProfile.photoURL || '',
      title: sessionTitle,
      invitedUserIds,
      invitedFriends: invitedFriendsMap,
      status: 'INVITED',
      createdAt: new Date().toISOString(),
      participants: {
        [hostProfile.id]: {
          userId: hostProfile.id,
          name: hostProfile.displayName || 'Host',
          avatarUrl: hostProfile.photoURL || '',
          initial: (hostProfile.displayName?.trim().charAt(0) || 'H').toUpperCase(),
          latitude: 0,
          longitude: 0,
          distanceKm: 0,
          pace: '--:--',
          speedKmH: 0,
          runState: 'PREPARING',
          status: 'ACCEPTED',
          updatedAt: new Date().toISOString(),
        },
      },
    };

    // Save session in Firestore
    await setDoc(sessionDocRef, sanitizeForFirestore(sessionData));

    // Dispatch RUN_INVITE requests to all invited friends
    for (const friend of invitedFriends) {
      const targetUserId = friend.userId || friend.id;
      try {
        await requestService.sendCrewRequest(
          hostProfile,
          targetUserId,
          'RUN_INVITE',
          sessionId
        );
      } catch (err) {
        console.warn(`Error sending group run invite to ${targetUserId}:`, err);
      }
    }

    return { session: sessionData };
  },

  // 2. Real-time subscription to active Group session
  subscribeToGroupSession(
    sessionId: string,
    onUpdate: (session: GroupRunSession | null) => void,
    onError?: (error: Error) => void
  ) {
    if (!sessionId) {
      onUpdate(null);
      return () => {};
    }

    const sessionDocRef = doc(db, 'group_sessions', sessionId);
    return onSnapshot(
      sessionDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        const data = snapshot.data() as GroupRunSession;
        onUpdate({
          ...data,
          id: snapshot.id,
        });
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // 3. Friend accepts Group session on their phone
  async acceptGroupSession(
    sessionId: string,
    userProfile: UserProfile
  ): Promise<void> {
    const sessionDocRef = doc(db, 'group_sessions', sessionId);
    const userId = userProfile.id;

    await setDoc(
      sessionDocRef,
      {
        status: 'ACTIVE',
        invitedFriends: {
          [userId]: {
            userId,
            name: userProfile.displayName || 'Runner',
            avatarUrl: userProfile.photoURL || '',
            initial: (userProfile.displayName?.trim().charAt(0) || 'R').toUpperCase(),
            status: 'ACCEPTED',
          },
        },
        participants: {
          [userId]: {
            userId,
            name: userProfile.displayName || 'Runner',
            avatarUrl: userProfile.photoURL || '',
            initial: (userProfile.displayName?.trim().charAt(0) || 'R').toUpperCase(),
            latitude: 0,
            longitude: 0,
            distanceKm: 0,
            pace: '--:--',
            speedKmH: 0,
            runState: 'PREPARING',
            status: 'ACCEPTED',
            updatedAt: new Date().toISOString(),
          },
        },
      },
      { merge: true }
    );
  },

  // 4. Friend declines Group session
  async declineGroupSession(sessionId: string, userId: string): Promise<void> {
    try {
      const sessionDocRef = doc(db, 'group_sessions', sessionId);
      await setDoc(
        sessionDocRef,
        {
          invitedFriends: {
            [userId]: {
              status: 'DECLINED',
            },
          },
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error declining group session:', e);
    }
  },

  // 5. Broadcast live GPS telemetry of a participant to Firestore
  async updateParticipantTelemetry(
    sessionId: string,
    userId: string,
    telemetry: Partial<GroupParticipantTelemetry>
  ): Promise<void> {
    if (!sessionId || !userId) return;

    try {
      const sessionDocRef = doc(db, 'group_sessions', sessionId);
      const sanitized = sanitizeForFirestore({
        ...telemetry,
        userId,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(
        sessionDocRef,
        {
          status: 'ACTIVE',
          participants: {
            [userId]: sanitized,
          },
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error updating group run telemetry:', err);
    }
  },

  // 6. Listen for incoming Group Run invites where active user is invited
  listenForIncomingGroupInvites(
    userId: string,
    onInvite: (session: GroupRunSession | null) => void
  ) {
    if (!userId) return () => {};

    const groupCol = collection(db, 'group_sessions');
    const q = query(
      groupCol,
      where('invitedUserIds', 'array-contains', userId),
      where('status', 'in', ['INVITED', 'ACTIVE'])
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        onInvite(null);
        return;
      }

      // Look for the newest session where this user is still INVITED
      const validInvites: GroupRunSession[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as GroupRunSession;
        const myInvite = data.invitedFriends?.[userId];
        if (myInvite && myInvite.status === 'INVITED' && data.hostUserId !== userId) {
          validInvites.push({ ...data, id: d.id });
        }
      });

      if (validInvites.length > 0) {
        // Return most recent invite
        validInvites.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onInvite(validInvites[0]);
      } else {
        onInvite(null);
      }
    });
  },

  // 7. End Group Session
  async endGroupSession(sessionId: string): Promise<void> {
    try {
      const sessionDocRef = doc(db, 'group_sessions', sessionId);
      await updateDoc(sessionDocRef, {
        status: 'COMPLETED',
      });
    } catch (e) {
      console.warn('Error ending group session:', e);
    }
  },
};
