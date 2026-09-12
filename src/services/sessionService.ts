import { collection, onSnapshot, query, orderBy, addDoc, limit } from '@firebase/firestore';
import { db } from '../config/firebase';
import { UpcomingSession } from '../types/data';

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

export const sessionService = {
  // Subscribe to the next upcoming session
  subscribeToUpcomingSession(
    userId: string,
    onUpdate: (session: UpcomingSession | null) => void,
    onError?: (error: Error) => void
  ) {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsRef, orderBy('scheduledAt', 'asc'), limit(1));

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          onUpdate({ id: doc.id, ...doc.data() } as UpcomingSession);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Schedule a new upcoming run session
  async scheduleSession(userId: string, session: Omit<UpcomingSession, 'id'>) {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const sanitized = sanitizeForFirestore(session);
    return await addDoc(sessionsRef, sanitized);
  },
};
