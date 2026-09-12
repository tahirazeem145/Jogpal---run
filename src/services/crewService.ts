import { collection, doc, setDoc, onSnapshot } from '@firebase/firestore';
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

export const crewService = {
  // Subscribe to crew members
  subscribeToCrew(
    userId: string,
    onUpdate: (crew: CrewMember[]) => void,
    onError?: (error: Error) => void
  ) {
    const crewRef = collection(db, 'users', userId, 'crew');
    return onSnapshot(
      crewRef,
      (snapshot) => {
        const crew: CrewMember[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CrewMember[];
        onUpdate(crew);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  // Invite / Add a crew member
  async addCrewMember(userId: string, member: CrewMember) {
    const memberDoc = doc(db, 'users', userId, 'crew', member.id);
    const sanitized = sanitizeForFirestore(member);
    await setDoc(memberDoc, sanitized, { merge: true });
  },
};
