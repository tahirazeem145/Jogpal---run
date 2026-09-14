import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, deleteDoc } from '@firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/data';

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

export const userService = {
  // Subscribe to realtime updates for a user profile
  subscribeToUserProfile(
    userId: string,
    onUpdate: (profile: UserProfile | null) => void,
    onError?: (error: Error) => void
  ) {
    const userDocRef = doc(db, 'users', userId);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ id: snapshot.id, ...snapshot.data() } as UserProfile);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Get user profile once
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userDocRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userDocRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as UserProfile;
    }
    return null;
  },

  // Initialize or update user profile
  async saveUserProfile(userId: string, data: Partial<UserProfile>) {
    const userDocRef = doc(db, 'users', userId);
    const sanitized = sanitizeForFirestore(data);
    await setDoc(userDocRef, sanitized, { merge: true });
  },

  // Update specific preferences
  async updatePreferences(userId: string, preferences: Partial<UserProfile>) {
    const userDocRef = doc(db, 'users', userId);
    const sanitized = sanitizeForFirestore(preferences);
    await updateDoc(userDocRef, sanitized);
  },

  // Subscribe to all registered runner profiles from Firestore
  subscribeToAllUsers(
    currentUserId: string,
    onUpdate: (users: UserProfile[]) => void,
    onError?: (error: Error) => void
  ) {
    const usersCollection = collection(db, 'users');
    return onSnapshot(
      usersCollection,
      (snapshot) => {
        const users: UserProfile[] = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as UserProfile))
          .filter((u) => {
            if (!u.id || u.id === currentUserId) return false;
            const isGuest =
              u.id.toLowerCase().startsWith('guest') ||
              u.email?.toLowerCase().startsWith('guest') ||
              u.displayName?.toLowerCase().startsWith('guest');
            return !isGuest;
          });
        onUpdate(users);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Delete user profile and data
  async deleteUserProfile(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  },
};
