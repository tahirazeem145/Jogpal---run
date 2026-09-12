const { initializeApp } = require('@firebase/app');
const { getFirestore, collection, getDocs, deleteDoc } = require('@firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCuiwXmBy9KfzOw03sxHTosmS5wMOdks6c",
  authDomain: "jogpal-5.firebaseapp.com",
  projectId: "jogpal-5",
  storageBucket: "jogpal-5.firebasestorage.app",
  messagingSenderId: "405112460867",
  appId: "1:405112460867:android:dcc26f038f17b91403e6f6",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollections() {
  console.log('Connecting to Firestore to delete all users and data...');
  
  // 1. Delete users and subcollections
  const usersSnapshot = await getDocs(collection(db, 'users'));
  console.log(`Found ${usersSnapshot.size} user documents in 'users' collection.`);
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    console.log(`Deleting user: ${userId} (${userDoc.data().displayName || userDoc.data().email || 'no-name'})`);
    
    // Delete subcollection 'crew'
    try {
      const crewSnap = await getDocs(collection(db, 'users', userId, 'crew'));
      for (const c of crewSnap.docs) {
        await deleteDoc(c.ref);
      }
    } catch (e) {}

    // Delete subcollection 'sessions'
    try {
      const sessionsSnap = await getDocs(collection(db, 'users', userId, 'sessions'));
      for (const s of sessionsSnap.docs) {
        await deleteDoc(s.ref);
      }
    } catch (e) {}

    // Delete user doc
    await deleteDoc(userDoc.ref);
  }

  // 2. Delete runs
  const runsSnapshot = await getDocs(collection(db, 'runs'));
  console.log(`Found ${runsSnapshot.size} documents in 'runs' collection.`);
  for (const r of runsSnapshot.docs) {
    await deleteDoc(r.ref);
  }

  console.log('Successfully deleted all users and runs from Firestore!');
  process.exit(0);
}

clearCollections().catch((err) => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
