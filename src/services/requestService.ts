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
  getDocs,
} from '@firebase/firestore';
import { db } from '../config/firebase';
import { CrewRequest, UserProfile, CrewMember } from '../types/data';
import { friendService } from './friendService';

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
  // Check if a friend connection or pending request already exists
  async checkRequestStatus(
    fromUserId: string,
    toUserId: string,
    type: 'CREW_INVITE' | 'RUN_INVITE' = 'CREW_INVITE'
  ): Promise<{ canSend: boolean; reason?: string }> {
    if (!toUserId || toUserId === fromUserId) {
      return { canSend: false, reason: 'You cannot send a request to yourself.' };
    }

    try {
      if (type === 'CREW_INVITE') {
        // 1. Check if already in user's friends
        const friendDoc = await getDoc(doc(db, 'users', fromUserId, 'friends', toUserId));
        if (friendDoc.exists()) {
          return { canSend: false, reason: 'This runner is already in your friends list!' };
        }
      }

      // 2. Check if outgoing request already sent and pending
      const sentDoc = await getDoc(doc(db, 'users', fromUserId, 'sent_requests', toUserId));
      if (sentDoc.exists() && type === 'CREW_INVITE') {
        return { canSend: false, reason: 'You have already sent a request to this runner. Waiting for their response.' };
      }

      return { canSend: true };
    } catch (err: any) {
      console.warn('Error checking request status:', err);
      return { canSend: true };
    }
  },

  // Send a friend request or live duo run invite to a target user
  async sendCrewRequest(
    fromProfile: UserProfile,
    toUserId: string,
    type: 'CREW_INVITE' | 'RUN_INVITE' = 'CREW_INVITE',
    sessionId?: string
  ): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (!toUserId || toUserId === fromProfile.id) {
      return { success: false, message: 'Invalid recipient ID' };
    }

    // Run duplicate check
    const check = await this.checkRequestStatus(fromProfile.id, toUserId, type);
    if (!check.canSend) {
      return { success: false, message: check.reason || 'Cannot send request at this time.' };
    }

    try {
      const requestId = `req_${fromProfile.id}_${Date.now()}`;
      const recipientRequestDoc = doc(db, 'users', toUserId, 'requests', requestId);
      const senderSentDoc = doc(db, 'users', fromProfile.id, 'sent_requests', toUserId);

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
        sessionId,
      };

      // Write incoming request to recipient
      await setDoc(recipientRequestDoc, sanitizeForFirestore(requestData));

      // Write outgoing pending record to sender
      await setDoc(
        senderSentDoc,
        sanitizeForFirestore({
          requestId,
          toUserId,
          createdAt: new Date().toISOString(),
          status: 'PENDING',
          type,
          sessionId,
        })
      );

      return {
        success: true,
        message: type === 'RUN_INVITE' ? 'Duo Run invitation sent!' : 'Friend request sent successfully!',
        requestId,
      };
    } catch (err: any) {
      console.warn('Error sending request:', err);
      return { success: false, message: err?.message || 'Failed to send request' };
    }
  },

  // Real-time listener for incoming requests
  subscribeToIncomingRequests(
    userId: string,
    onUpdate: (requests: CrewRequest[]) => void,
    onError?: (error: Error) => void
  ) {
    if (!userId) {
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

  // Real-time listener for pending outgoing/sent requests
  subscribeToSentRequests(
    userId: string,
    onUpdate: (sentToUserIds: string[]) => void,
    onError?: (error: Error) => void
  ) {
    if (!userId) {
      onUpdate([]);
      return () => {};
    }

    const sentRef = collection(db, 'users', userId, 'sent_requests');

    return onSnapshot(
      sentRef,
      (snapshot) => {
        const sentUserIds = snapshot.docs.map((docSnap) => docSnap.id);
        onUpdate(sentUserIds);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Accept a friend request -> Mutually links both runners into each other's FRIENDS list
  async acceptCrewRequest(
    request: CrewRequest,
    currentProfile: UserProfile
  ): Promise<void> {
    try {
      // 1. Add Sender to Current User's Friends Section
      const senderFriend: CrewMember = {
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
      await friendService.addFriend(currentProfile.id, senderFriend);

      // 2. Add Current User to Sender's Friends Section (Mutual Connection)
      const currentFriend: CrewMember = {
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
      await friendService.addFriend(request.fromUserId, currentFriend);

      // 3. Remove the request doc from recipient's pending requests
      const requestDoc = doc(db, 'users', currentProfile.id, 'requests', request.id);
      await deleteDoc(requestDoc);

      // 4. Remove sent_requests entry from sender
      try {
        const senderSentDoc = doc(db, 'users', request.fromUserId, 'sent_requests', currentProfile.id);
        await deleteDoc(senderSentDoc);
      } catch (e) {}

      // 5. Clean up any reverse sent_requests entry from recipient
      try {
        const recipientSentDoc = doc(db, 'users', currentProfile.id, 'sent_requests', request.fromUserId);
        await deleteDoc(recipientSentDoc);
      } catch (e) {}
    } catch (err) {
      console.warn('Error accepting friend request:', err);
      throw err;
    }
  },

  // Reject / Dismiss a friend request
  async rejectCrewRequest(userId: string, requestId: string, fromUserId?: string): Promise<void> {
    try {
      const requestDoc = doc(db, 'users', userId, 'requests', requestId);
      await deleteDoc(requestDoc);

      if (fromUserId) {
        try {
          const senderSentDoc = doc(db, 'users', fromUserId, 'sent_requests', userId);
          await deleteDoc(senderSentDoc);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Error rejecting friend request:', err);
      throw err;
    }
  },
};
