import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDoc,
} from '@firebase/firestore';
import { db } from '../config/firebase';
import { CrewRequest, UserProfile, CrewMember } from '../types/data';
import { crewService } from './crewService';

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

export const requestService = {
  // Send a crew invite request to a target user
  async sendCrewRequest(
    fromProfile: UserProfile,
    toUserId: string,
    type: 'CREW_INVITE' | 'RUN_INVITE' = 'CREW_INVITE'
  ): Promise<{ success: boolean; message: string }> {
    if (!toUserId || toUserId === fromProfile.id) {
      return { success: false, message: 'Invalid recipient ID' };
    }

    try {
      const requestId = `req_${fromProfile.id}_${Date.now()}`;
      const requestDoc = doc(db, 'users', toUserId, 'requests', requestId);

      const requestData: CrewRequest = {
        id: requestId,
        fromUserId: fromProfile.id,
        fromUserName: fromProfile.displayName || fromProfile.email?.split('@')[0] || 'Runner',
        fromUserEmail: fromProfile.email || '',
        fromUserAvatar: fromProfile.photoURL,
        fromUserLevel: fromProfile.level || 1,
        toUserId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        type,
      };

      await setDoc(requestDoc, sanitizeForFirestore(requestData));
      return { success: true, message: 'Request sent successfully!' };
    } catch (err: any) {
      console.warn('Error sending crew request:', err);
      return { success: false, message: err?.message || 'Failed to send request' };
    }
  },

  // Real-time listener for incoming requests
  subscribeToIncomingRequests(
    userId: string,
    onUpdate: (requests: CrewRequest[]) => void,
    onError?: (error: Error) => void
  ) {
    if (!userId || userId === 'guest_runner') {
      onUpdate([]);
      return () => {};
    }

    const requestsRef = collection(db, 'users', userId, 'requests');

    return onSnapshot(
      requestsRef,
      (snapshot) => {
        const requests: CrewRequest[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as CrewRequest;
          if (!data.status || data.status === 'PENDING') {
            requests.push({
              ...data,
              id: docSnap.id,
            });
          }
        });

        // Sort latest first
        requests.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        onUpdate(requests);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Accept a crew request -> Mutually links both runners into each other's crew
  async acceptCrewRequest(
    request: CrewRequest,
    currentProfile: UserProfile
  ): Promise<void> {
    try {
      // 1. Add Sender to Current User's Crew
      const senderMember: CrewMember = {
        id: request.fromUserId,
        userId: request.fromUserId,
        name: request.fromUserName,
        initial: (request.fromUserName.trim().charAt(0) || 'R').toUpperCase(),
        email: request.fromUserEmail,
        avatarUrl: request.fromUserAvatar,
        level: request.fromUserLevel || 1,
        status: 'ACTIVE',
        isOnline: true,
      };
      await crewService.addCrewMember(currentProfile.id, senderMember);

      // 2. Add Current User to Sender's Crew (Mutual Connection)
      const currentMember: CrewMember = {
        id: currentProfile.id,
        userId: currentProfile.id,
        name: currentProfile.displayName || currentProfile.email?.split('@')[0] || 'Runner',
        initial: (currentProfile.displayName?.trim().charAt(0) || 'R').toUpperCase(),
        email: currentProfile.email,
        avatarUrl: currentProfile.photoURL,
        level: currentProfile.level || 1,
        totalDistanceKm: currentProfile.totalDistanceKm || 0,
        streakDays: currentProfile.streakDays || 0,
        status: 'ACTIVE',
        isOnline: true,
      };
      await crewService.addCrewMember(request.fromUserId, currentMember);

      // 3. Remove the request doc from pending requests
      const requestDoc = doc(db, 'users', currentProfile.id, 'requests', request.id);
      await deleteDoc(requestDoc);
    } catch (err) {
      console.warn('Error accepting crew request:', err);
      throw err;
    }
  },

  // Reject / Dismiss a crew request
  async rejectCrewRequest(userId: string, requestId: string): Promise<void> {
    try {
      const requestDoc = doc(db, 'users', userId, 'requests', requestId);
      await deleteDoc(requestDoc);
    } catch (err) {
      console.warn('Error rejecting crew request:', err);
      throw err;
    }
  },
};
