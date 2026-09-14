import { collection, doc, setDoc, onSnapshot, getDoc, deleteDoc } from '@firebase/firestore';
import { db } from '../config/firebase';
import { CrewMember } from '../types/data';

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

export const friendService = {
  // Subscribe to accepted friends in real-time
  subscribeToFriends(
    userId: string,
    onUpdate: (friends: CrewMember[]) => void,
    onError?: (error: Error) => void
  ) {
    if (!userId) {
      onUpdate([]);
      return () => {};
    }

    const friendsRef = collection(db, 'users', userId, 'friends');
    return onSnapshot(
      friendsRef,
      (snapshot) => {
        const friends: CrewMember[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CrewMember[];
        onUpdate(friends);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Add / Save an accepted friend
  async addFriend(userId: string, friend: CrewMember) {
    const friendDoc = doc(db, 'users', userId, 'friends', friend.id);
    const sanitized = sanitizeForFirestore(friend);
    await setDoc(friendDoc, sanitized, { merge: true });
  },

  // Remove a friend
  async removeFriend(userId: string, friendId: string) {
    const friendDoc = doc(db, 'users', userId, 'friends', friendId);
    await deleteDoc(friendDoc);
  },
};
