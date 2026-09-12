const { initializeApp } = require('@firebase/app');
const { getFirestore, doc, deleteDoc, getDocs, collection, query, where } = require('@firebase/firestore');

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

// Target user IDs to delete
const targetUserIds = [
  'PZSFwysaREWaGkLZxIY1qm06b282', // test (test@gmail.com)
  '6gX1GYeDHkTYyZISa2PStL4sOKz1', // azeemtahir575 (azeemtahir575@gmail.com)
  '8qvF78JBB7MxvoD3ouUlAtgv4ea2', // runner_google_account (runner_google_account@jogpal.app)
  'gtOTqPLrbUNX6kfnZklbpb0gevg1', // Azeem 2 (azeemtahir575@gmail.com)
];

async function deleteTestUsers() {
  console.log('--- Starting Deletion of Test Users ---');

  for (const uid of targetUserIds) {
    console.log(`\nProcessing deletion for UID: ${uid}`);

    // 1. Delete subcollection 'crew'
    try {
      const crewSnap = await getDocs(collection(db, 'users', uid, 'crew'));
      for (const c of crewSnap.docs) {
        await deleteDoc(c.ref);
        console.log(`  - Deleted subcollection crew doc: ${c.id}`);
      }
    } catch (e) {
      console.log(`  - Subcollection crew check failed: ${e.message}`);
    }

    // 2. Delete subcollection 'sessions'
    try {
      const sessionsSnap = await getDocs(collection(db, 'users', uid, 'sessions'));
      for (const s of sessionsSnap.docs) {
        await deleteDoc(s.ref);
        console.log(`  - Deleted subcollection session doc: ${s.id}`);
      }
    } catch (e) {
      console.log(`  - Subcollection sessions check failed: ${e.message}`);
    }

    // 3. Delete runs belonging to this user
    try {
      const runsSnap = await getDocs(collection(db, 'runs'));
      for (const r of runsSnap.docs) {
        if (r.data().userId === uid) {
          await deleteDoc(r.ref);
          console.log(`  - Deleted run doc: ${r.id}`);
        }
      }
    } catch (e) {
      console.log(`  - Runs check failed: ${e.message}`);
    }

    // 4. Delete user document from 'users' collection
    try {
      await deleteDoc(doc(db, 'users', uid));
      console.log(`  - Deleted user doc: users/${uid}`);
    } catch (e) {
      console.log(`  - Failed to delete user doc: ${e.message}`);
    }
  }

  // 5. Clean up any crew references in remaining users pointing to deleted users
  console.log('\n--- Cleaning up crew references in other accounts ---');
  const remainingUsersSnap = await getDocs(collection(db, 'users'));
  for (const userDoc of remainingUsersSnap.docs) {
    const crewSnap = await getDocs(collection(db, 'users', userDoc.id, 'crew'));
    for (const c of crewSnap.docs) {
      if (targetUserIds.includes(c.id) || targetUserIds.includes(c.data().userId)) {
        await deleteDoc(c.ref);
        console.log(`  - Deleted crew reference ${c.id} from user ${userDoc.id} (${userDoc.data().displayName})`);
      }
    }
  }

  console.log('\n--- Verification: Current Remaining Users in Firestore ---');
  const finalUsersSnap = await getDocs(collection(db, 'users'));
  console.log(`Total users remaining: ${finalUsersSnap.size}`);
  finalUsersSnap.forEach((d) => {
    const data = d.data();
    console.log(`- [${d.id}] Name: "${data.displayName}", Email: "${data.email}"`);
  });

  console.log('\nDeletion completed successfully.');
  process.exit(0);
}

deleteTestUsers().catch((err) => {
  console.error('Deletion error:', err);
  process.exit(1);
});
