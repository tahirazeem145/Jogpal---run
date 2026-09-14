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
import { DuoRunSession, DuoParticipantTelemetry, UserProfile, CrewMember } from '../types/data';
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

export const duoRunService = {
  // 1. Host creates a new real-time Duo Run session and dispatches invitation
  async createDuoSession(
    hostProfile: UserProfile,
    guestFriend: CrewMember
  ): Promise<{ session: DuoRunSession; requestId?: string }> {
    const targetUserId = guestFriend.userId || guestFriend.id;
    const sessionId = `duo_${hostProfile.id}_${targetUserId}_${Date.now()}`;
    const sessionDocRef = doc(db, 'duo_sessions', sessionId);

    const sessionData: DuoRunSession = {
      id: sessionId,
      hostUserId: hostProfile.id,
      hostName: hostProfile.displayName || hostProfile.email?.split('@')[0] || 'Runner',
      hostAvatar: hostProfile.photoURL || '',
      guestUserId: targetUserId,
      guestName: guestFriend.name || 'Runner',
      guestAvatar: guestFriend.avatarUrl || guestFriend.photoURL || '',
      status: 'INVITED',
      createdAt: new Date().toISOString(),
      participants: {},
    };

    // Save session in Firestore
    await setDoc(sessionDocRef, sanitizeForFirestore(sessionData));

    // Send RUN_INVITE request to guest with sessionId
    const reqRes = await requestService.sendCrewRequest(
      hostProfile,
      targetUserId,
      'RUN_INVITE',
      sessionId
    );

    return {
      session: sessionData,
      requestId: reqRes.requestId,
    };
  },

  // 2. Real-time subscription to active Duo session
  subscribeToDuoSession(
    sessionId: string,
    onUpdate: (session: DuoRunSession | null) => void,
    onError?: (error: Error) => void
  ) {
    if (!sessionId) {
      onUpdate(null);
      return () => {};
    }

    const sessionDocRef = doc(db, 'duo_sessions', sessionId);
    return onSnapshot(
      sessionDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        const data = snapshot.data() as DuoRunSession;
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

  // 3. Guest accepts Duo session
  async acceptDuoSession(sessionId: string): Promise<void> {
    const sessionDocRef = doc(db, 'duo_sessions', sessionId);
    await updateDoc(sessionDocRef, {
      status: 'ACCEPTED',
    });
  },

  // 4. Decline or cancel Duo session
  async declineDuoSession(sessionId: string): Promise<void> {
    try {
      const sessionDocRef = doc(db, 'duo_sessions', sessionId);
      await updateDoc(sessionDocRef, {
        status: 'CANCELLED',
      });
    } catch (e) {
      console.warn('Error declining duo session:', e);
    }
  },

  // 5. Update live participant GPS telemetry (lat, lng, pace, distance, speed)
  async updateParticipantTelemetry(
    sessionId: string,
    userId: string,
    telemetry: Partial<DuoParticipantTelemetry>
  ): Promise<void> {
    if (!sessionId || !userId) return;

    try {
      const sessionDocRef = doc(db, 'duo_sessions', sessionId);
      const sanitizedTelemetry = sanitizeForFirestore({
        ...telemetry,
        userId,
        updatedAt: new Date().toISOString(),
      });

      // Update nested participant telemetry
      await updateDoc(sessionDocRef, {
        [`participants.${userId}`]: sanitizedTelemetry,
        status: 'ACTIVE',
      });
    } catch (err) {
      // Fallback merge setDoc if update fails
      try {
        const sessionDocRef = doc(db, 'duo_sessions', sessionId);
        await setDoc(
          sessionDocRef,
          {
            status: 'ACTIVE',
            participants: {
              [userId]: sanitizeForFirestore({
                ...telemetry,
                userId,
                updatedAt: new Date().toISOString(),
              }),
            },
          },
          { merge: true }
        );
      } catch (innerErr) {
        console.warn('Error updating telemetry in duo session:', innerErr);
      }
    }
  },

  // 6. Complete Duo session
  async endDuoSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    try {
      const sessionDocRef = doc(db, 'duo_sessions', sessionId);
      await updateDoc(sessionDocRef, {
        status: 'COMPLETED',
      });
    } catch (e) {
      console.warn('Error ending duo session:', e);
    }
  },

  // 7. Real-time listener for incoming Duo Run invitations for the current user
  listenForIncomingDuoInvites(
    userId: string,
    onInvite: (session: DuoRunSession) => void,
    onError?: (error: Error) => void
  ) {
    if (!userId) {
      return () => {};
    }

    const sessionsQuery = query(
      collection(db, 'duo_sessions'),
      where('guestUserId', '==', userId),
      where('status', '==', 'INVITED')
    );

    return onSnapshot(
      sessionsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as DuoRunSession;
            onInvite({
              ...data,
              id: change.doc.id,
            });
          }
        });
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },
};
